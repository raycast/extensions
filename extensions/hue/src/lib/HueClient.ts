/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BridgeConfig,
  GroupedLight,
  Light,
  LightRequest,
  Method,
  Room,
  Scene,
  SceneRequest,
  UpdateEvent,
  Zone,
} from "./types";
import { ClientHttp2Session, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, sensitiveHeaders } from "http2";
import RateLimitedQueue from "./RateLimitedQueue";
import { logError } from "../helpers/errors";

const DATA_PREFIX = "data: ";
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_ACCEPT } = constants;

type Response = {
  headers: IncomingHttpHeaders & IncomingHttpStatusHeader;
  data: {
    errors: { description: string }[];
    data: any[];
  };
};

export default class HueClient {
  private readonly lightsQueue = new RateLimitedQueue(10);
  private readonly groupedLightsQueue = new RateLimitedQueue(1, 1);

  constructor(
    private readonly bridgeConfig: BridgeConfig,
    private readonly http2Session: ClientHttp2Session,
  ) {}

  public async getLights(): Promise<Light[]> {
    const response = await this.makeRequest("GET", "/clip/v2/resource/light");
    return response.data.data;
  }

  public async getGroupedLights(): Promise<GroupedLight[]> {
    const response = await this.makeRequest("GET", "/clip/v2/resource/grouped_light");
    return response.data.data;
  }

  public async getScenes(): Promise<Scene[]> {
    const response = await this.makeRequest("GET", "/clip/v2/resource/scene");
    return response.data.data;
  }

  public async getRooms(): Promise<Room[]> {
    const response = await this.makeRequest("GET", "/clip/v2/resource/room");
    return response.data.data;
  }

  public async getZones(): Promise<Zone[]> {
    const response = await this.makeRequest("GET", "/clip/v2/resource/zone");
    return response.data.data;
  }

  public async updateLight(light: Light, properties: LightRequest): Promise<Partial<Light>[]> {
    const response = await this.lightsQueue.enqueueRequest(() =>
      this.makeRequest("PUT", `/clip/v2/resource/light/${light.id}`, properties),
    );

    return response.data.data;
  }

  public async updateGroupedLight(groupedLight: GroupedLight, properties: Partial<GroupedLight>): Promise<any> {
    const response = await this.groupedLightsQueue.enqueueRequest(() =>
      this.makeRequest("PUT", `/clip/v2/resource/grouped_light/${groupedLight.id}`, properties),
    );

    return response.data.data;
  }

  public async updateScene(scene: Scene, properties: SceneRequest): Promise<any> {
    const response = await this.makeRequest("PUT", `/clip/v2/resource/scene/${scene.id}`, properties);

    return response.data.data;
  }

  private makeRequest(method: Method, path: string, body?: any): Promise<Response> {
    return new Promise((resolve, reject) => {
      const stream = this.http2Session.request({
        [HTTP2_HEADER_METHOD]: method,
        [HTTP2_HEADER_PATH]: path,
        "hue-application-key": this.bridgeConfig.username,
        [sensitiveHeaders]: ["hue-application-key"],
      });

      let data = "";

      if (body !== undefined) {
        stream.write(JSON.stringify(body), "utf8");
      }

      stream.setEncoding("utf8");

      const response: Response = {
        headers: {},
        data: {
          errors: [],
          data: [],
        },
      };

      stream.on("response", (responseHeaders: IncomingHttpHeaders & IncomingHttpStatusHeader) => {
        response.headers = responseHeaders;
      });

      stream.on("data", (chunk) => {
        data += chunk;
      });

      stream.on("end", () => {
        stream.close();

        try {
          if (response.headers[":status"] !== 200 && response.headers["content-type"] === "text/html") {
            // On non-200 responses, the body is an HTML page with an error message
            const errorMatch = data.match(/(?<=<div class="error">)(.*?)(?=<\/div>)/);
            if (errorMatch && errorMatch[0]) {
              const errorMessage = `Status ${response.headers[":status"]}: ${errorMatch[0]}`;
              logError(errorMessage);
              return reject(new Error(errorMessage));
            }
          }

          response.data = JSON.parse(data);

          if (response.data.errors != null && response.data.errors.length > 0) {
            const errorMessage = response.data.errors.map((error) => error.description).join(", ");
            console.error({ headers: response.headers, message: errorMessage });
            return reject(new Error(errorMessage));
          }

          return resolve(response);
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

  public listenToEventSource(onUpdate: (resources: UpdateEvent["data"]) => void): () => void {
    const stream = this.http2Session.request({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/eventstream/clip/v2",
      [HTTP2_HEADER_ACCEPT]: "text/event-stream",
      "hue-application-key": this.bridgeConfig.username,
      [sensitiveHeaders]: ["hue-application-key"],
    });

    let buffer = "";

    stream.setEncoding("utf8");

    stream.on("data", (chunk) => {
      const lines = (buffer + chunk).split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith(DATA_PREFIX)) continue;
        try {
          (JSON.parse(line.slice(DATA_PREFIX.length)) as UpdateEvent[]).forEach((updateEvent) =>
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
