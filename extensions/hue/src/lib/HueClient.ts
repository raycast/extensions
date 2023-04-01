/* eslint-disable @typescript-eslint/no-explicit-any */

import https from "https";
import fs from "fs";
import { environment, getPreferenceValues } from "@raycast/api";
import axios, { AxiosRequestConfig, Method } from "axios";
import { Light } from "./hueV2Types";

export default class HueClient {
  bridgeIpAddress: string;
  bridgeId: string;
  bridgeUsername: string;
  httpsAgent: https.Agent;
  config: AxiosRequestConfig;

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

  public async toggleLight(light: Light): Promise<any> {
    // Setting transition time when turning a light on causes the light to turn on at 1% brightness.
    return await this.request("PUT", `clip/v2/resource/light/${light.id}`, {
      "on": {
        "on": !light.on.on
      }
    });
  }
}