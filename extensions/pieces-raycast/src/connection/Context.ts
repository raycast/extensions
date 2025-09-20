import {
  Application,
  ApplicationNameEnum,
  Context,
  PlatformEnum,
  SeededTrackedApplication,
} from "@pieces.app/pieces-os-client";
import { version as app_version } from "../../package.json";
import ConnectorSingleton from "./ConnectorSingleton";

export default class ContextService {
  private static instance: ContextService;

  private contextPromise: Promise<Context | null> | null = null;

  private _platform = process.platform;
  private _platformMap: { [key: string]: PlatformEnum } = {
    win32: PlatformEnum.Windows,
    darwin: PlatformEnum.Macos,
    linux: PlatformEnum.Linux,
  };

  private application: SeededTrackedApplication = {
    name: ApplicationNameEnum.Raycast,
    version: app_version,
    platform: this._platformMap[this._platform] || PlatformEnum.Unknown,
  };

  private constructor() {}

  public async getApplication(): Promise<Application | null> {
    if (this.contextPromise) {
      const context = await this.contextPromise.catch(() => null);
      return context?.application ?? null;
    }

    this.contextPromise = ConnectorSingleton.getInstance()
      .connectorApi.connect({
        seededConnectorConnection: { application: this.application },
      })
      .catch(() => {
        return null;
      });

    const context = await this.contextPromise.catch(() => null);

    if (!context) this.contextPromise = null;

    return context?.application ?? null;
  }

  public static getInstance() {
    return (this.instance ??= new ContextService());
  }
}
