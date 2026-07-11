import { showToast } from "@raycast/api";
import { AthomCloudAPI } from "homey-api";
import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { Storage } from "./Storage";
import { Toast } from "@raycast/api";

type CapabilityState = {
  value?: boolean;
};

export type HomeyDevice = {
  id: string;
  name: string;
  zone?: string;
  available?: boolean;
  unavailableMessage?: string;
  capabilitiesObj?: {
    onoff?: CapabilityState;
  };
};

export type HomeyFlow = {
  id: string;
  name: string;
  order: number;
  folder?: string;
  advanced?: boolean;
  enabled?: boolean;
  triggerable?: boolean;
};

type HomeyFolder = {
  id: string;
  name: string;
  order: number;
};

export type FlowGroup = HomeyFolder & {
  flows: HomeyFlow[];
};

export type DeviceGroup = HomeyFolder & {
  devices: HomeyDevice[];
};

type HomeyApi = {
  flow: {
    getFlowFolders(): Promise<Record<string, HomeyFolder>>;
    getFlows(): Promise<Record<string, HomeyFlow>>;
    getAdvancedFlows(): Promise<Record<string, HomeyFlow>>;
    triggerAdvancedFlow(input: { id: string }): Promise<void>;
    triggerFlow(input: { id: string }): Promise<void>;
  };
  zones: {
    getZones(): Promise<Record<string, HomeyFolder>>;
  };
  devices: {
    getDevices(): Promise<Record<string, HomeyDevice>>;
    getDevice(input: { id: string }): Promise<HomeyDevice>;
    setCapabilityValue(input: { deviceId: string; capabilityId: "onoff"; value: boolean }): Promise<void>;
  };
};

type HomeyTokenInput = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  grant_type: string;
};

type HomeyTokenConstructor = new (input: HomeyTokenInput) => AthomCloudAPI.Token;

export class HomeyAuthenticationError extends Error {
  constructor(message = "Homey authentication expired. Please run the command again to re-authenticate.") {
    super(message);
    this.name = "HomeyAuthenticationError";
  }
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Homey",
  providerIcon: "8502422.png",
  providerId: "homey",
  description: "Connect your Homey account",
});
const clientId = "6329993ef2699f0bc1e4cc07";

export const provider = new OAuthService({
  client,
  clientId: "6329993ef2699f0bc1e4cc07",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/WTWZbnJLBrEo1FEYJ0E4Ix5Wpsxnpfkcb5d2EURGgmOtgPnpIE8QvYHgJX0LeG9yryHZ71LssD1tli8bdKKVlKuEIMx-W-Ql8H72V2kBFkRgv0HPkPPGPv6ULdVrop4rZsMi-kohkLrs7glA",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/7EXpLgXJ1PDijhpr-BiJe3CVd8JGSZsST-oAdflCaTWLJuEE0vRMulR8bHGX4SRrBJWgXgZKC4A0b2jF90p7QELwCoXdZQnHrigsXbfLOolG1PwDUbDNB971f6EllEs4ndcak66nGw8",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/ptpJtGSqQUGUt9zDDZGzv4iW-Vn7965_rjjtPM3sOeRSXhXL_GIF4ZrNDUR21AhW5zg-MUeZuMdoKG1co7oEkas3HYBat5-W4rLPUMScN0yOM5zlapM6xD-ryNobzZ55v22lc_5qXKo",
  scope: "",
});

async function authorize(): Promise<void> {
  try {
    await provider.authorize();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication failed",
      message: "Please try running the command again",
    });
    throw error;
  }
}

async function handleUnauthorized(): Promise<void> {
  try {
    await client.removeTokens();
  } catch {
    // Continue with the user-facing authentication error even if token cleanup fails.
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Authentication expired",
    message: "Please run the command again to re-authenticate",
  });
}

export class Homey {
  private user?: AthomCloudAPI.User;

  private homeys: AthomCloudAPI.Homey[] = [];

  private homey?: AthomCloudAPI.Homey;

  private homeyApi?: HomeyApi;

  getHomey(): AthomCloudAPI.Homey | undefined {
    return this.homey;
  }

  // port: 49153
  async auth(): Promise<void> {
    if (!this.user) {
      await authorize();
      const tokenSet = await provider.client.getTokens();

      let __token: AthomCloudAPI.Token | undefined = undefined;
      const store = new Storage();
      if (tokenSet?.accessToken) {
        const Token = AthomCloudAPI.Token as unknown as HomeyTokenConstructor;
        __token = new Token({
          access_token: tokenSet.accessToken,
          refresh_token: tokenSet.refreshToken ?? "",
          expires_in: tokenSet.expiresIn ?? 0,
          grant_type: "authorization_code",
          token_type: "bearer",
        });
        await store.set({ token: __token });
      } else {
        await handleUnauthorized();
        throw new HomeyAuthenticationError();
      }
      // Create a Cloud API instance
      const cloudApi = new AthomCloudAPI({
        clientId,
        redirectUrl: "https://raycast.com/redirect?packageName=Extension",
        autoRefreshTokens: false,

        token: __token,
        store,
      } as ConstructorParameters<typeof AthomCloudAPI>[0]);
      const loggedIn = await cloudApi.isLoggedIn();

      if (!loggedIn) {
        await handleUnauthorized();
        throw new HomeyAuthenticationError();
      }
      this.user = await cloudApi.getAuthenticatedUser();
      this.homeys = this.user.getHomeys();
    }
  }
  async selectFirstHomey(): Promise<void> {
    if (!this.user) {
      throw new HomeyAuthenticationError("Homey is not authenticated. Please run the command again.");
    }
    if (!this.homey || !this.homeyApi) {
      const homey = this.homeys[0];
      if (!homey) {
        throw new Error("No Homey Available");
      }
      this.homey = homey;
      // Create a session on this Homey

      const homeyApi = await this.homey!.authenticate();

      this.homeyApi = homeyApi as unknown as HomeyApi;
    }
  }

  async getFlowsWithFolders(): Promise<FlowGroup[]> {
    if (!this.homeyApi) {
      await this.selectFirstHomey();
    }
    const directory: Record<string, FlowGroup> = {};

    const flowFolders = await this.homeyApi!.flow.getFlowFolders();
    const folders = Object.values(flowFolders);
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

    const todos = await this.homeyApi!.flow.getFlows();
    const flows = Object.values(todos);
    for (const flow of flows) {
      const folderId = flow.folder && directory[flow.folder] ? flow.folder : "general";
      directory[folderId].flows.push(flow);
    }

    const todos2 = await this.homeyApi!.flow.getAdvancedFlows();
    const flows2 = Object.values(todos2);
    for (const flow of flows2) {
      flow.advanced = true;

      const folderId = flow.folder && directory[flow.folder] ? flow.folder : "general";
      directory[folderId].flows.push(flow);
    }
    return Object.values(directory);
  }

  async getDevicesInGroups(): Promise<DeviceGroup[]> {
    if (!this.homeyApi) {
      await this.selectFirstHomey();
    }
    const directory: Record<string, DeviceGroup> = {};

    const flowFolders = await this.homeyApi!.zones.getZones();
    const folders = Object.values(flowFolders);
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

    const devices = await this.homeyApi!.devices.getDevices();
    const deviceList = Object.values(devices);
    for (const device of deviceList) {
      const zoneId = device.zone && directory[device.zone] ? device.zone : "general";
      directory[zoneId].devices.push(device);
    }
    return Object.values(directory);
  }

  async triggerFlow(id: string, advanced = false): Promise<void> {
    if (advanced) {
      await this.homeyApi!.flow.triggerAdvancedFlow({ id });
    } else {
      await this.homeyApi!.flow.triggerFlow({ id: id });
    }
  }

  async toggleDevice(id: string): Promise<void> {
    const capability = await this.homeyApi!.devices.getDevice({ id: id });
    const value = Boolean(capability.capabilitiesObj?.onoff?.value);

    await this.homeyApi!.devices.setCapabilityValue({ deviceId: id, capabilityId: "onoff", value: !value });
  }

  async turnOnDevice(id: string): Promise<void> {
    await this.homeyApi!.devices.setCapabilityValue({ deviceId: id, capabilityId: "onoff", value: true });
  }

  async turnOffDevice(id: string): Promise<void> {
    await this.homeyApi!.devices.setCapabilityValue({ deviceId: id, capabilityId: "onoff", value: false });
  }
}
