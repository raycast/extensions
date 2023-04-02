/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs";
import { environment } from "@raycast/api";
import { GroupedLight, Light, Room, Scene, UpdateEvent, Zone } from "./types";
import {
  ClientHttp2Session,
  connect,
  constants,
  IncomingHttpHeaders,
  IncomingHttpStatusHeader,
  OutgoingHttpHeaders,
  sensitiveHeaders,
} from "http2";
import React from "react";

const DATA_PREFIX = "data: ";
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_ACCEPT } = constants;

type Response = {
  headers: IncomingHttpHeaders & IncomingHttpStatusHeader;
  data: {
    errors: { description: string }[];
    data: any[];
  };
};

// TODO: Implement rate limiting of max 10 requests per second for lights and
//  1 request per second for groups and scenes
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

  constructor(
    bridgeIpAddress: string,
    bridgeId: string,
    bridgeUsername: string,
    setLights: React.Dispatch<React.SetStateAction<Light[]>>,
    setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
    setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
    setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>
  ) {
    this.bridgeIpAddress = bridgeIpAddress;
    this.bridgeId = bridgeId;
    this.bridgeUsername = bridgeUsername;
    this.setLights = setLights;
    this.setGroupedLights = setGroupedLights;
    this.setRooms = setRooms;
    this.setZones = setZones;
    this.setScenes = setScenes;
    this.http2Session = connect(`https://${bridgeIpAddress}`, {
      ca: fs.readFileSync(environment.assetsPath + "/philips-hue-cert.pem"),
      checkServerIdentity: (hostname, cert) => {
        if (cert.subject.CN === bridgeId?.toLowerCase()) {
          return;
        } else {
          return new Error("Server identity check failed. CN does not match bridgeId.");
        }
      },
    });
    this.listenToEventSource();
  }

  public async getLights(): Promise<Light[]> {
    const response = await this.executeRequest({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/clip/v2/resource/light",
    });
    return response.data.data;
  }

  public async getGroupedLights(): Promise<GroupedLight[]> {
    const response = await this.executeRequest({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/clip/v2/resource/grouped_light",
    });
    return response.data.data;
  }

  public async getScenes(): Promise<Scene[]> {
    const response = await this.executeRequest({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/clip/v2/resource/scene",
    });
    return response.data.data;
  }

  public async getRooms(): Promise<Room[]> {
    const response = await this.executeRequest({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/clip/v2/resource/room",
    });
    return response.data.data;
  }

  public async getZones(): Promise<Zone[]> {
    const response = await this.executeRequest({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/clip/v2/resource/zone",
    });
    return response.data.data;
  }

  public async toggleLight(light: Light): Promise<any> {
    const response = await this.executeRequest(
      {
        [HTTP2_HEADER_METHOD]: "PUT",
        [HTTP2_HEADER_PATH]: `/clip/v2/resource/light/${light.id}`,
      },
      {
        on: { on: !light.on.on },
        // TODO: Figure out why transition time causes the light to turn on at 1% brightness
        // dynamics: { duration: getTransitionTimeInMs() },
      }
    );
    return response.data.data;
  }

  public async setBrightness(light: Light, brightness: number): Promise<any> {
    const response = await this.executeRequest(
      {
        [HTTP2_HEADER_METHOD]: "PUT",
        [HTTP2_HEADER_PATH]: `/clip/v2/resource/light/${light.id}`,
      },
      {
        ...(light.on.on ? {} : { on: { on: true } }),
        dimming: { brightness: brightness },
      }
    );

    return response.data.data;
  }

  private executeRequest(headers: OutgoingHttpHeaders, body?: any): Promise<Response> {
    return new Promise((resolve, reject) => {
      const stream = this.http2Session.request({
        ...headers,
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
          response.data = JSON.parse(data);

          if (response.data.errors != null && response.data.errors.length > 0) {
            const errorMessage = response.data.errors.map((error) => error.description).join(", ");
            new Error(errorMessage);
          }

          resolve(response);
        } catch (e) {
          console.error(response.headers, data);
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

        updateEvents.forEach((updateEvent) => {
          // TODO: support other resource types
          const lights = updateEvent.data
            .filter((resource) => resource.type === "light")
            .map((resource) => resource as Light);

          this.setLights((prevState: Light[]) => {
            return prevState.updateItems(prevState, lights);
          });
        });
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
