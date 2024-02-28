/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BridgeConfig,
  GroupedLight,
  HasId,
  Light,
  LightRequest,
  Method,
  ParsedUpdateEvent,
  Room,
  Scene,
  SceneRequest,
  Zone,
} from "./types";
import { ClientHttp2Session, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, sensitiveHeaders } from "http2";
import React from "react";
import RateLimitedQueue from "./RateLimitedQueue";
import StreamArray from "stream-json/streamers/StreamArray";
import Chain from "stream-chain";
import "../helpers/arrayExtensions";

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
  public bridgeConfig: BridgeConfig;
  private readonly http2Session: ClientHttp2Session;
  private readonly setLights?: React.Dispatch<React.SetStateAction<Light[]>>;
  private readonly setGroupedLights?: React.Dispatch<React.SetStateAction<GroupedLight[]>>;
  private readonly setRooms?: React.Dispatch<React.SetStateAction<Room[]>>;
  private readonly setZones?: React.Dispatch<React.SetStateAction<Zone[]>>;
  private readonly setScenes?: React.Dispatch<React.SetStateAction<Scene[]>>;
  private readonly lightsQueue = new RateLimitedQueue(10);
  private readonly groupedLightsQueue = new RateLimitedQueue(1, 1);

  constructor(
    bridgeConfig: BridgeConfig,
    http2Session: ClientHttp2Session,
    setLights?: React.Dispatch<React.SetStateAction<Light[]>>,
    setGroupedLights?: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
    setRooms?: React.Dispatch<React.SetStateAction<Room[]>>,
    setZones?: React.Dispatch<React.SetStateAction<Zone[]>>,
    setScenes?: React.Dispatch<React.SetStateAction<Scene[]>>,
  ) {
    this.http2Session = http2Session;
    this.bridgeConfig = bridgeConfig;
    this.setLights = setLights;
    this.setGroupedLights = setGroupedLights;
    this.setRooms = setRooms;
    this.setZones = setZones;
    this.setScenes = setScenes;
    this.listenToEventSource();
  }

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
              console.error({ headers: response.headers, message: errorMatch[0] });
              return reject(`Status ${response.headers[":status"]}: ${errorMatch[0]}`);
            }
          }

          response.data = JSON.parse(data);

          if (response.data.errors != null && response.data.errors.length > 0) {
            const errorMessage = response.data.errors.map((error) => error.description).join(", ");
            console.error({ headers: response.headers, message: errorMessage });
            return reject(errorMessage);
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

  private listenToEventSource(): void {
    const stream = this.http2Session.request({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/eventstream/clip/v2",
      [HTTP2_HEADER_ACCEPT]: "text/event-stream",
      "hue-application-key": this.bridgeConfig.username,
      [sensitiveHeaders]: ["hue-application-key"],
    });

    let parser: Chain | null = null;

    const onParsedUpdateEvent = ({ value: updateEvent }: ParsedUpdateEvent) => {
      this.setLights?.((lights) => {
        const lightUpdates = updateEvent.data.filter((resource) => {
          return resource.type === "light";
        }) as (Partial<Light> & HasId)[];

        return lights.replaceItems(lightUpdates.mergeObjectsById());
      });

      this.setGroupedLights?.((groupedLights) => {
        const updatedGroupedLights = updateEvent.data.filter((resource) => {
          return resource.type === "grouped_light";
        }) as (Partial<GroupedLight> & HasId)[];
        return groupedLights.replaceItems(updatedGroupedLights);
      });

      this.setRooms?.((rooms) => {
        const updatedRooms = updateEvent.data.filter((resource) => {
          return resource.type === "room";
        }) as (Partial<Room> & HasId)[];
        return rooms.replaceItems(updatedRooms);
      });

      this.setZones?.((zones) => {
        const updatedZones = updateEvent.data.filter((resource) => {
          return resource.type === "zone";
        }) as (Partial<Zone> & HasId)[];
        return zones.replaceItems(updatedZones);
      });

      this.setScenes?.((scenes) => {
        const updatedScenes = updateEvent.data.filter((resource) => {
          return resource.type === "scene";
        }) as (Partial<Scene> & HasId)[];
        return scenes.replaceItems(updatedScenes);
      });

      // If the parser encounters a new JSON array, it will throw an error
      // because two successive arrays is not valid JSON.
      // To prevent this, a new parser is created for each new array.
      parser = null;
    };

    stream.setEncoding("utf8");

    stream.on("data", (chunk) => {
      parser ??= createParser(parser, onParsedUpdateEvent);

      const lines = chunk.split("\n");

      for (const line of lines) {
        const dataPrefixIndex = line.indexOf(DATA_PREFIX);
        if (dataPrefixIndex === -1) continue;
        const dataString: string = line.substring(dataPrefixIndex + DATA_PREFIX.length);
        parser.write(dataString);
      }
    });

    stream.on("end", () => {
      parser?.end();
      stream.close();
    });

    stream.on("error", (error) => {
      parser?.end();
      stream.close();
      console.error(error, [parser?.input]);
    });
  }
}

function createParser(parser: Chain | null, callback: (data: ParsedUpdateEvent) => void): Chain {
  parser = StreamArray.withParser();

  parser.on("data", (data) => {
    callback(data);
    parser = null;
  });

  parser.on("error", (error) => {
    console.error(error);
  });

  return parser;
}
