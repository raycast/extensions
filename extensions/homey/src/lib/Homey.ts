import { LocalStorage } from "@raycast/api";
import { AthomCloudAPI, HomeyAPI } from "homey-api";
import { OAuth } from "@raycast/api";
import express from "express";
import { Storage } from "./Storage";
export class Homey {
  private user: any; //AthomCloudAPI.User;

  private homey: any; //HomeyAPI.Homey;

  private homeyApi: any; //HomeyAPI;

  getHomey() {
    return this.homey;
  }
  // port: 49153
  async auth() {
    if (!this.user) {
      let token: string | null = null;
      const code = (await LocalStorage.getItem<string>("_token")) as string;
      let __token = undefined;
      if (code) {
        __token = new AthomCloudAPI.Token(JSON.parse(code));
      }
      // Create a Cloud API instance
      const cloudApi = new AthomCloudAPI({
        clientId: "6329993ef2699f0bc1e4cc07",
        clientSecret: "aa3095aa2585d909a17952c131c78a79fbf1f334",
        redirectUrl: "http://localhost:49153/oauth/callback",

        token: __token,
        store: new Storage(),
      });
      const loggedIn = await cloudApi.isLoggedIn();
      if (!loggedIn) {
        const client = new OAuth.PKCEClient({
          redirectMethod: OAuth.RedirectMethod.Web,
          providerName: "Homey",
          providerIcon: "8502422.png",
          description: "Connect your Homey account...",
        });

        const promise = new Promise((resolve, reject) => {
          const server = express();
          let _server: any = null;
          let state: any = null;
          server.get("/oauth/callback", async (req, res) => {
            const token = req.query.code;

            res.redirect("https://raycast.com/redirect?packageName=Extension&state=" + state + "&code=" + token);

            _server?.close();
            resolve(token);
          });

          server.get("/oauth", async (req, res) => {
            state = req.query.state;

            res.redirect(cloudApi.getLoginUrl());
          });

          _server = server.listen(49153);
        });
        const request = await client.authorizationRequest({
          scope: "homey",
          clientId: "6329993ef2699f0bc1e4cc07",
          endpoint: "http://localhost:49153/oauth",
        });
        try {
          const req = await client.authorize(request);
        } catch (error) {
          console.log(error);
        }
        const data = await promise;
        token = data as string;
      }

      if (token) {
        const _token = await cloudApi.authenticateWithAuthorizationCode({ code: token });
        await LocalStorage.setItem("_token", JSON.stringify(_token));
      }
      // Get the logged in user
      this.user = (await cloudApi.getAuthenticatedUser({ additionalScopes: "" })) as any;
    }
  }
  async selectFirstHomey() {
    if (!this.homey) {
      const homey = await this.user.getFirstHomey();
      this.homey = homey;
      // Create a session on this Homey

      const homeyApi = await this.homey.authenticate();

      this.homeyApi = homeyApi;
    }
  }

  async getFlowsWithFolders() {
    const directory: { [key: string]: { name: string; order: number; flows: any[]; id: any } } = {};

    const flowFolders = await this.homeyApi.flow.getFlowFolders();
    const folders: any = Object.values(flowFolders);
    directory["general"] = {
      id: "general",
      name: "general",
      order: 9999,
      flows: [],
    };
    for (const folder of folders) {
      directory[folder.id] = {
        id: folder.id,
        name: folder.name,
        order: folder.order,
        flows: [],
      };
    }

    const todos = await this.homeyApi.flow.getFlows();
    const flows: any = Object.values(todos);
    for (const flow of flows) {
      directory[flow.folder || "general"].flows.push(flow);
    }

    const todos2 = await this.homeyApi.flow.getAdvancedFlows();
    const flows2: any = Object.values(todos2);
    for (const flow of flows2) {
      flow.advanced = true;

      directory[flow.folder || "general"].flows.push(flow);
    }
    return Object.values(directory);
  }

  async getDevicesInGroups() {
    const directory: { [key: string]: { name: string; order: number; devices: any[]; id: any } } = {};

    const flowFolders = await this.homeyApi.zones.getZones();
    const folders: any = Object.values(flowFolders);
    directory["general"] = {
      id: "general",
      name: "general",
      order: 9999,
      devices: [],
    };
    for (const folder of folders) {
      directory[folder.id] = {
        id: folder.id,
        order: 0,
        name: folder.name,
        devices: [],
      };
    }

    const devices = await this.homeyApi.devices.getDevices();
    const deviceList: any = Object.values(devices);
    for (const device of deviceList) {
      directory[device.zone || "general"].devices.push(device);
    }
    return Object.values(directory);
  }

  async triggerFlow(id: any, advanced = false) {
    if (advanced) {
      await this.homeyApi.flow.triggerAdvancedFlow({ id });
    } else {
      await this.homeyApi.flow.triggerFlow({ id: id });
    }
  }

  async toggleDevice(id: any) {
    const capability = await this.homeyApi.devices.getDevice({ id: id });
    const value = capability.capabilitiesObj.onoff.value;

    await this.homeyApi.devices.setCapabilityValue({ deviceId: id, capabilityId: "onoff", value: !value });
  }

  async turnOnDevice(id: any) {
    await this.homeyApi.devices.setCapabilityValue({ deviceId: id, capabilityId: "onoff", value: true });
  }

  async turnOffDevice(id: any) {
    await this.homeyApi.devices.setCapabilityValue({ deviceId: id, capabilityId: "onoff", value: false });
  }
}
