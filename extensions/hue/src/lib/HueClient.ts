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
import {
  ClientHttp2Session,
  IncomingHttpHeaders,
  IncomingHttpStatusHeader,
  OutgoingHttpHeaders,
  sensitiveHeaders,
} from "http2";
import { text } from "stream/consumers";
import RateLimitedQueue from "./RateLimitedQueue";
import { logError } from "../helpers/errors";
import { CONNECTION_TIMEOUT_MS } from "../helpers/constants";

const DATA_PREFIX = "data: ";

export const authHeaders = (username: string) => ({
  "hue-application-key": username,
  [sensitiveHeaders]: ["hue-application-key"],
});

// A request the bridge never answers would otherwise hold up the rate-limited queues for good.
export async function request(session: ClientHttp2Session, headers: OutgoingHttpHeaders, body?: object) {
  const signal = AbortSignal.timeout(CONNECTION_TIMEOUT_MS);
  try {
    const stream = session.request(headers, { endStream: body === undefined, signal });
    if (body !== undefined) stream.end(JSON.stringify(body));
    let responseHeaders: IncomingHttpHeaders & IncomingHttpStatusHeader = {};
    stream.once("response", (received) => (responseHeaders = received));
    const data = await text(stream);
    // A connection the bridge closes ends the stream without a response.
    if (responseHeaders[":status"] === undefined) throw new Error("No response");
    return { headers: responseHeaders, data };
  } catch (error) {
    if (signal.aborted) throw new Error("Request to Hue Bridge timed out", { cause: error });
    throw new Error("Lost connection to Hue Bridge", { cause: error });
  }
}

export default class HueClient {
  private readonly lightsQueue = new RateLimitedQueue(10);
  private readonly groupedLightsQueue = new RateLimitedQueue(1, 1);

  constructor(
    private readonly bridgeConfig: BridgeConfig,
    private readonly http2Session: ClientHttp2Session,
  ) {}

  // Ends the session once its open streams, like the event stream, close.
  public close() {
    this.http2Session.close();
  }

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

  private async makeRequest<T>(method: "GET" | "PUT", path: string, body?: object): Promise<T[]> {
    const { headers, data } = await request(
      this.http2Session,
      { ":method": method, ":path": path, ...authHeaders(this.bridgeConfig.username) },
      body,
    );

    // Whatever went wrong, the bridge sends the same HTML page, even with status 200, so only the status tells.
    if (headers["content-type"] === "text/html") {
      const status = headers[":status"];
      if (status === 403) throw new Error("Hue Bridge rejected the username");
      if (status === 429 || status === 503) throw new Error("Hue Bridge is busy, try again");
      throw new Error(`Status ${status} from Hue Bridge`);
    }

    const response: HueResponse<T> = JSON.parse(data);

    if (response.errors != null && response.errors.length > 0) {
      const errorMessage = response.errors.map((error) => error.description).join(", ");
      console.error({ headers, message: errorMessage });
      throw new Error(errorMessage);
    }

    return response.data;
  }

  public listenToEventSource(onUpdate: (resources: HueEvent["data"]) => void): () => void {
    // Node 22 throws, inside the effect that listens, when the session closed before the effect ran.
    if (this.http2Session.closed || this.http2Session.destroyed) return () => {};
    const stream = this.http2Session.request(
      {
        ":method": "GET",
        ":path": "/eventstream/clip/v2",
        accept: "text/event-stream",
        ...authHeaders(this.bridgeConfig.username),
      },
      { endStream: true },
    );

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

    stream.on("error", logError);

    return () => stream.close();
  }
}
