import {
  BridgeConfig,
  GroupedLight,
  GroupedLightRequest,
  HueEvent,
  HueResource,
  HueResponse,
  Light,
  LightRequest,
  ResourceIdentifier,
  Room,
  Scene,
  SceneRequest,
  Zone,
} from "./types";
import { ClientHttp2Session, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, sensitiveHeaders } from "http2";
import RateLimitedQueue from "./RateLimitedQueue";
import { logError } from "../helpers/errors";

const DATA_PREFIX = "data: ";
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_ACCEPT } = constants;

export const authHeaders = (username: string) => ({
  "hue-application-key": username,
  [sensitiveHeaders]: ["hue-application-key"],
});

export default class HueClient {
  private readonly lightsQueue = new RateLimitedQueue(10);
  private readonly groupedLightsQueue = new RateLimitedQueue(1, 1);

  constructor(
    private readonly bridgeConfig: BridgeConfig,
    private readonly http2Session: ClientHttp2Session,
  ) {}

  public getLights(): Promise<Light[]> {
    return this.getAll<Light>("light");
  }

  // The bridge errors on parallel requests (as if an endpoint is missing), so fetch sequentially.
  // Lights load last: useHue applies all four at once, and older snapshots undo optimistic updates.
  // The property names are useHueResources' useCachedState keys, which toggleAllLights also writes.
  public async getResources() {
    return {
      rooms: await this.getAll<Room>("room"),
      zones: await this.getAll<Zone>("zone"),
      scenes: await this.getAll<Scene>("scene"),
      lights: await this.getLights(),
    };
  }

  private getAll<R extends HueResource>(type: R["type"]): Promise<R[]> {
    return this.makeRequest<R>("GET", `/clip/v2/resource/${type}`);
  }

  public updateLight(light: Light, properties: LightRequest): Promise<ResourceIdentifier[]> {
    return this.lightsQueue.enqueueRequest(() =>
      this.makeRequest<ResourceIdentifier>("PUT", `/clip/v2/resource/light/${light.id}`, properties),
    );
  }

  public updateGroupedLight(
    groupedLight: Pick<GroupedLight, "id">,
    properties: GroupedLightRequest,
  ): Promise<ResourceIdentifier[]> {
    return this.groupedLightsQueue.enqueueRequest(() =>
      this.makeRequest<ResourceIdentifier>("PUT", `/clip/v2/resource/grouped_light/${groupedLight.id}`, properties),
    );
  }

  public updateScene(scene: Scene, properties: SceneRequest): Promise<ResourceIdentifier[]> {
    return this.makeRequest<ResourceIdentifier>("PUT", `/clip/v2/resource/scene/${scene.id}`, properties);
  }

  private makeRequest<T>(method: "GET" | "PUT", path: string, body?: object): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const stream = this.http2Session.request({
        [HTTP2_HEADER_METHOD]: method,
        [HTTP2_HEADER_PATH]: path,
        ...authHeaders(this.bridgeConfig.username),
      });

      let data = "";

      if (body !== undefined) {
        stream.write(JSON.stringify(body), "utf8");
      }

      stream.setEncoding("utf8");

      let headers: IncomingHttpHeaders & IncomingHttpStatusHeader = {};

      stream.on("response", (responseHeaders) => {
        headers = responseHeaders;
      });

      stream.on("data", (chunk) => {
        data += chunk;
      });

      stream.on("end", () => {
        stream.close();

        try {
          if (headers[":status"] !== 200 && headers["content-type"] === "text/html") {
            // On non-200 responses, the body is an HTML page with an error message
            const errorMatch = data.match(/(?<=<div class="error">)(.*?)(?=<\/div>)/);
            if (errorMatch && errorMatch[0]) {
              const errorMessage = `Status ${headers[":status"]}: ${errorMatch[0]}`;
              logError(errorMessage);
              return reject(new Error(errorMessage));
            }
          }

          const response: HueResponse<T> = JSON.parse(data);

          if (response.errors != null && response.errors.length > 0) {
            const errorMessage = response.errors.map((error) => error.description).join(", ");
            console.error({ headers, message: errorMessage });
            return reject(new Error(errorMessage));
          }

          return resolve(response.data);
        } catch (error) {
          return reject(error);
        }
      });

      stream.on("error", (error) => {
        return reject(error);
      });

      stream.end();
    });
  }

  public listenToEventSource(onUpdate: (resources: HueEvent["data"]) => void): () => void {
    const stream = this.http2Session.request({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/eventstream/clip/v2",
      [HTTP2_HEADER_ACCEPT]: "text/event-stream",
      ...authHeaders(this.bridgeConfig.username),
    });

    let buffer = "";

    stream.setEncoding("utf8");

    stream.on("data", (chunk) => {
      const lines = (buffer + chunk).split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith(DATA_PREFIX)) continue;
        try {
          (JSON.parse(line.slice(DATA_PREFIX.length)) as HueEvent[]).forEach((updateEvent) =>
            onUpdate(updateEvent.data),
          );
        } catch (error) {
          logError(error);
        }
      }
    });

    stream.on("end", () => stream.close());

    stream.on("error", (error) => {
      stream.close();
      logError(error);
    });

    return () => stream.close();
  }
}
