/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs";
import { environment } from "@raycast/api";
import { Light, Room, Scene } from "./types";
import {
  ClientHttp2Session,
  connect,
  constants,
  IncomingHttpHeaders,
  IncomingHttpStatusHeader,
  OutgoingHttpHeaders,
  sensitiveHeaders,
} from "http2";

const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH } = constants;

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
  private readonly http2Session: ClientHttp2Session;

  constructor(bridgeIpAddress: string, bridgeId: string, bridgeUsername: string) {
    this.bridgeIpAddress = bridgeIpAddress;
    this.bridgeId = bridgeId;
    this.bridgeUsername = bridgeUsername;
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
  }

  public async getLights(): Promise<Light[]> {
    const response = await this.executeRequest({
      [HTTP2_HEADER_METHOD]: "GET",
      [HTTP2_HEADER_PATH]: "/clip/v2/resource/light",
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

  public async toggleLight(light: Light): Promise<any> {
    const response = await this.executeRequest(
      {
        [HTTP2_HEADER_METHOD]: "PUT",
        [HTTP2_HEADER_PATH]: `/clip/v2/resource/light/${light.id}`,
      },
      {
        on: { on: !light.on.on },
        // TODO: Figure out why transition time causes the light to turn on at 1% brightness
        // dynamics: { duration: parseInt(getPreferenceValues().transitionTime) },
      }
    );
    return response.data.data;
  }

  public async setBrightness(light: Light, brightness: number): Promise<any> {
    const response = await this.executeRequest(
      {
        [HTTP2_HEADER_METHOD]: "PUT",
        [HTTP2_HEADER_PATH]: `clip/v2/resource/light/${light.id}`,
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
          if (response.headers[":status"] !== 200 && response.headers["content-type"] !== "text/html") {
            const errorMatch = data.match(/(?<=<div class="error">)(.*?)(?=<\/div>)/);
            if (errorMatch && errorMatch[0]) {
              new Error(errorMatch[0]);
            }
          }

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
}
