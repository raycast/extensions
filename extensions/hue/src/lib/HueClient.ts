/* eslint-disable @typescript-eslint/no-explicit-any */

import https from "https";
import fs from "fs";
import { environment } from "@raycast/api";
import axios, { AxiosRequestConfig, Method } from "axios";
import { Light, Room, Scene } from "./types";

export default class HueClient {
  public bridgeIpAddress: string;
  public bridgeId: string;
  public bridgeUsername: string;
  private readonly httpsAgent: https.Agent;
  private readonly config: AxiosRequestConfig;

  constructor(
    bridgeIpAddress: string,
    bridgeId: string,
    bridgeUsername: string,
  ) {
    this.bridgeIpAddress = bridgeIpAddress;
    this.bridgeId = bridgeId;
    this.bridgeUsername = bridgeUsername;
    this.httpsAgent = new https.Agent({
      ca: fs.readFileSync(environment.assetsPath + "/philips-hue-cert.pem"),
      checkServerIdentity: (hostname, cert) => {
        console.log(cert.subject.CN, bridgeId?.toLowerCase());
        if (cert.subject.CN === bridgeId?.toLowerCase()) {
          return;
        } else {
          return new Error("Server identity check failed. CN does not match bridgeId.");
        }
      }
    });

    this.config = {
      headers: {
        "hue-application-key": this.bridgeUsername,
      },
      httpsAgent: this.httpsAgent,
    };
  }

  private async request(method: Method, path: string, data?: any): Promise<any> {
    const response = await axios.request({
      ...this.config,
      baseURL: `https://${this.bridgeIpAddress}`,
      url: path,
      method,
      data,
    });

    if (response.data["errors"] != null && response.data["errors"].length > 0) {
      throw new Error(response.data["errors"]);
    }

    return response.data["data"];
  }

  public async getLights(): Promise<Light[]> {
    return this.request("GET", "/clip/v2/resource/light");
  }

  public async getScenes(): Promise<Scene[]> {
    return this.request("GET", "/clip/v2/resource/scene");
  }

  public async getRooms(): Promise<Room[]> {
    return this.request("GET", "/clip/v2/resource/room");
  }

  public async toggleLight(light: Light): Promise<any> {
    // Setting transition time when turning a light on causes the light to turn on at 1% brightness.
    return await this.request("PUT", `clip/v2/resource/light/${light.id}`, {
      "on": {
        "on": !light.on.on
      }
    });
  }
}