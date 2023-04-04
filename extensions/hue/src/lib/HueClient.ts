/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs";
import { environment } from "@raycast/api";
import { GroupedLight, Light, LightRequest, Method, Room, Scene, SceneRequest, UpdateEvent, Zone } from "./types";
import {
  ClientHttp2Session,
  connect,
  constants,
  IncomingHttpHeaders,
  IncomingHttpStatusHeader,
  sensitiveHeaders,
} from "http2";
import React from "react";
import RateLimitedQueue from "./RateLimitedQueue";

const DATA_PREFIX = "data: ";
const CONNECTION_TIMEOUT_MS = 5000;
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_ACCEPT } = constants;

type Response = {
  headers: IncomingHttpHeaders & IncomingHttpStatusHeader;
  data: {
    errors: { description: string }[];
    data: any[];
  };
};

export default class HueClient {
  public bridgeIpAddress: string;
  public bridgeId: string;
  public bridgeUsername: string;
  private readonly setLights: React.Dispatch<React.SetStateAction<Light[]>>;
  private readonly setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>;
  private readonly setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  private readonly setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  private readonly setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  private readonly http2Session: ClientHttp2Session;
  private readonly rateLimitedQueue = new RateLimitedQueue();

  private constructor(
    bridgeIpAddress: string,
    bridgeId: string,
    bridgeUsername: string,
    http2Session: ClientHttp2Session,
    setLights: React.Dispatch<React.SetStateAction<Light[]>>,
    setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
    setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
    setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>
  ) {
    this.bridgeUsername = bridgeUsername;
    this.http2Session = http2Session;
    this.bridgeIpAddress = bridgeIpAddress;
    this.bridgeId = bridgeId;
    this.setLights = setLights;
    this.setGroupedLights = setGroupedLights;
    this.setRooms = setRooms;
    this.setZones = setZones;
    this.setScenes = setScenes;
    this.listenToEventSource();
  }

  public static async createInstance(
    bridgeIpAddress: string,
    bridgeId: string,
    bridgeUsername: string,
    setLights: React.Dispatch<React.SetStateAction<Light[]>>,
    setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
    setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
    setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>
  ) {
    const http2Session = await new Promise<ClientHttp2Session>((resolve, reject) => {
      const session = connect(`https://${bridgeIpAddress}`, {
        ca: fs.readFileSync(environment.assetsPath + "/philips-hue-cert.pem"),
        checkServerIdentity: (hostname, cert) => {
          if (cert.subject.CN === bridgeId.toLowerCase()) {
            return;
          } else {
            return new Error("Server identity check failed. CN does not match bridgeId.");
          }
        },
      });

      session.setTimeout(CONNECTION_TIMEOUT_MS, () => {
        reject(new Error("Connection timed out."));
      });

      session.once("connect", () => {
        resolve(session);
      });

      session.once("error", (error) => {
        reject(error);
      });
    });

    return new HueClient(
      bridgeIpAddress,
      bridgeId,
      bridgeUsername,
      http2Session,
      setLights,
      setGroupedLights,
      setRooms,
      setZones,
      setScenes
    );
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

  public async updateLight(light: Light, properties: LightRequest): Promise<any> {
    this.setLights((lights) => lights.updateItem(light, properties));
    const response = await this.makeRequest("PUT", `/clip/v2/resource/light/${light.id}`, properties).catch((e) => {
      this.setLights((lights) => lights.updateItem(light, light));
      throw e;
    });

    return response.data.data;
  }

  public async updateGroupedLight(groupedLight: GroupedLight, properties: Partial<Light>): Promise<any> {
    this.setGroupedLights((groupedLights) => groupedLights.updateItem(groupedLight, properties));
    const request = async () =>
      await this.makeRequest("PUT", `/clip/v2/resource/grouped_light/${groupedLight.id}`, properties).catch((e) => {
        this.setGroupedLights((groupedLights) => groupedLights.updateItem(groupedLight, groupedLight));
        throw e;
      });

    const response = await this.rateLimitedQueue.enqueueRequest(request);

    return response.data.data;
  }

  public async updateScene(scene: Scene, properties: SceneRequest): Promise<any> {
    // TODO: Update all lights that are defined in the actions object and undo on error
    const response = await this.makeRequest("PUT", `/clip/v2/resource/scene/${scene.id}`, properties);

    return response.data.data;
  }

  private makeRequest(method: Method, path: string, body?: any): Promise<Response> {
    return new Promise((resolve, reject) => {
      const stream = this.http2Session.request({
        [HTTP2_HEADER_METHOD]: method,
        [HTTP2_HEADER_PATH]: path,
        "hue-application-key": this.bridgeUsername,
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
            const errorMatch = data.match(/(?<=<div class="error">)(.*?)(?=<\/div>)/);
            if (errorMatch && errorMatch[0]) {
              console.error({ headers: response.headers, message: errorMatch[0] });
              reject(new Error(errorMatch[0]));
            }
          }

          response.data = JSON.parse(data);

          if (response.data.errors != null && response.data.errors.length > 0) {
            const errorMessage = response.data.errors.map((error) => error.description).join(", ");
            console.error({ headers: response.headers, message: errorMessage });
            reject(new Error(errorMessage));
          }

          resolve(response);
        } catch (e) {
          reject(e);
        }
      });

      stream.on("error", (e) => {
        reject(e);
      });

      stream.end();
    });
  }

  private listenToEventSource(): void {
    const stream = this.http2Session.request({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/eventstream/clip/v2",
      [HTTP2_HEADER_ACCEPT]: "text/event-stream",
      "hue-application-key": this.bridgeUsername,
      [sensitiveHeaders]: ["hue-application-key"],
    });

    stream.setEncoding("utf8");

    stream.on("data", (data) => {
      const lines = data.split("\n");

      for (const line of lines) {
        const dataPrefixIndex = line.indexOf(DATA_PREFIX);
        if (dataPrefixIndex === -1) continue;

        const dataString: string = line.substring(dataPrefixIndex + DATA_PREFIX.length);
        const updateEvents: UpdateEvent[] = JSON.parse(dataString);

        updateEvents.forEach((updateEvent) =>
          updateEvent.data.forEach((resource) => {
            switch (resource.type) {
              case "light":
                this.setLights((prevState: Light[]) => {
                  return prevState.updateItem(resource as Light, resource);
                });
                break;
              case "grouped_light":
                this.setGroupedLights((prevState: GroupedLight[]) => {
                  return prevState.updateItem(resource as GroupedLight, resource);
                });
                break;
              case "room":
                this.setRooms((prevState: Room[]) => {
                  return prevState.updateItem(resource as Room, resource);
                });
                break;
              case "zone":
                this.setZones((prevState: Zone[]) => {
                  return prevState.updateItem(resource as Zone, resource);
                });
                break;
              case "scene":
                this.setScenes((prevState: Scene[]) => {
                  return prevState.updateItem(resource as Scene, resource);
                });
            }
          })
        );
      }
    });

    stream.on("end", () => {
      stream.close();
    });

    stream.on("error", (error) => {
      console.error(error);
      stream.close();
    });
    stream.end();
  }
}
