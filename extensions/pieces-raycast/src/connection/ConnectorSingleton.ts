import {
  ApplicationNameEnum,
  ApplicationsApi,
  Configuration,
  ConfigurationParameters,
  ConnectorApi,
  Context,
  PlatformEnum,
  SeededConnectorConnection,
  SeededTrackedApplication,
  AllocationsApi,
  ApplicationApi,
  AssetApi,
  AssetsApi,
  Configuration as CoreConfig,
  FormatApi,
  LinkifyApi,
  SearchApi,
  OSApi,
  UserApi,
  WellKnownApi,
  QGPTApi,
  DiscoveryApi,
  AnnotationsApi,
  AnnotationApi,
  ModelApi,
  ModelsApi,
  ActivityApi,
  ActivitiesApi,
  ConversationApi,
  ConversationMessageApi,
  ConversationMessagesApi,
  ConversationsApi,
  AnchorPointApi,
  AnchorApi,
  AnchorsApi,
  TagApi,
  WebsiteApi,
  FetchAPI,
} from "@pieces.app/pieces-os-client";
import { version as app_version } from "../../package.json";
import * as fs from "fs";
import path from "path";
import Notifications from "../ui/Notifications";
import fetch from "node-fetch";

export default class ConnectorSingleton {
  private static instance: ConnectorSingleton;
  private _platform = process.platform;
  private _platformMap: { [key: string]: PlatformEnum } = {
    win32: PlatformEnum.Windows,
    darwin: PlatformEnum.Macos,
    linux: PlatformEnum.Linux,
  };
  private static _port: string | null = null;
  public apiContext!: Context;
  public configuration: Configuration = new Configuration(this.parameters);
  public connectorApi!: ConnectorApi;
  public conversationApi!: ConversationApi;
  public conversationsApi!: ConversationsApi;
  public anchorApi!: AnchorApi;
  public anchorsApi!: AnchorsApi;
  public anchorPointApi!: AnchorPointApi;
  public conversationMessagesApi!: ConversationMessagesApi;
  public conversationMessageApi!: ConversationMessageApi;
  public modelApi!: ModelApi;
  public modelsApi!: ModelsApi;
  public searchApi!: SearchApi;
  public allocationsApi!: AllocationsApi;
  public applicationApi!: ApplicationApi;
  public applicationsApi!: ApplicationsApi;
  public linkifyApi!: LinkifyApi;
  public assetsApi!: AssetsApi;
  public formatApi!: FormatApi;
  public userApi!: UserApi;
  public osApi!: OSApi;
  public assetApi!: AssetApi;
  public DiscoveryApi!: DiscoveryApi;
  public wellKnownApi!: WellKnownApi;
  public QGPTApi!: QGPTApi;
  public annotationsApi!: AnnotationsApi;
  public annotationApi!: AnnotationApi;
  public activityApi!: ActivityApi;
  public activitiesApi!: ActivitiesApi;
  public tagApi!: TagApi;
  public websiteApi!: WebsiteApi;
  private constructor() {
    this.watchConfigFile();
    this.createApis();
  }

  private static set port(port: string | null) {
    if (port == ConnectorSingleton._port && port != null) return;

    // Update all sockets on Port changing
    ConnectorSingleton._port = port;
    ConnectorSingleton.getInstance().createApis();
  }

  private static get port() {
    return ConnectorSingleton._port;
  }

  public watchConfigFile() {
    const file = ConnectorSingleton.getPortConfigFile();
    if (!file) {
      return;
    }
    const dir = path.dirname(file);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, ""); // let's create a new one to watch it!
    }
    fs.watch(file, (eventType, filename) => {
      if (filename) {
        ConnectorSingleton.port = fs.readFileSync(file, "utf8").trim();
      }
    });
  }

  public static getHost(): string {
    return "http://127.0.0.1:" + ConnectorSingleton.getPort();
  }

  public static getPort(): string {
    if (ConnectorSingleton.port !== "" && ConnectorSingleton.port !== null) {
      return ConnectorSingleton.port;
    }
    try {
      return ConnectorSingleton.loadConfigFile();
    } catch (error) {
      return this.portScanning();
    }
  }

  static portScanning(): string {
    const numPorts = 34;
    const batchSize = 5; // Check 5 ports concurrently
    const ports = Array.from({ length: numPorts }, (_, i) => 39300 + i);

    // Split ports into batches
    for (let i = 0; i < ports.length; i += batchSize) {
      const batch = ports.slice(i, i + batchSize);
      const xhrRequests = batch.map((port) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `http://localhost:${port}/.well-known/health`, false);
        xhr.timeout = 100;
        return { xhr, port };
      });

      // Execute batch concurrently
      for (const { xhr, port } of xhrRequests) {
        try {
          xhr.send();
          if (xhr.status === 200) {
            ConnectorSingleton.port = port.toString();
            return port.toString();
          }
        } catch {
          continue;
        }
      }
    }

    throw new Error("PiecesOS is not running");
  }

  public static loadConfigFile(): string {
    const path = ConnectorSingleton.getPortConfigFile();
    if (!path) throw Error("Config file is not found");
    const port = fs.readFileSync(path, "utf8").trim();
    if (port == "") throw Error("Config file is empty");
    ConnectorSingleton.port = port;
    return port;
  }

  public static getPortConfigFile(isDebug?: boolean) {
    const releaseMode = isDebug ? "debug" : "production";

    switch (process.platform) {
      case "win32":
        return `${process.env.HOME}/Documents/com.pieces.os/${releaseMode}/Config/.port.txt`;
      case "linux":
        return `${process.env.HOME}/Documents/com.pieces.os/${releaseMode}/Config/.port.txt`;
      case "darwin":
        return `${process.env.HOME}/Library/com.pieces.os/${releaseMode}/Config/.port.txt`;
      default:
        Notifications.getInstance().errorToast(
          `Pieces for Raycast extension does not support platform: ${process.platform}`,
        ); // I think this should not happend
        return null;
    }
  }

  public get parameters(): ConfigurationParameters {
    let host;
    try {
      host = ConnectorSingleton.getHost();
    } catch {
      host = "http://localhost:39300";
    }
    return {
      basePath: host,
      fetchApi: fetch as unknown as FetchAPI,
    };
  }

  public application: SeededTrackedApplication = {
    name: ApplicationNameEnum.Obsidian,
    version: app_version,
    platform: this._platformMap[this._platform] || PlatformEnum.Unknown,
  };

  public seeded: SeededConnectorConnection = {
    application: this.application,
  };

  private createApis(application?: string) {
    if (application) {
      (this.parameters.headers ??= {})["application"] = application;
    }

    this.configuration = new Configuration(this.parameters);

    const coreConfig = new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
      headers: this.parameters.headers,
    });

    this.connectorApi = new ConnectorApi(this.configuration);
    this.conversationApi = new ConversationApi(coreConfig);
    this.conversationsApi = new ConversationsApi(coreConfig);
    this.anchorApi = new AnchorApi(coreConfig);
    this.anchorsApi = new AnchorsApi(coreConfig);
    this.anchorPointApi = new AnchorPointApi(coreConfig);
    this.conversationMessagesApi = new ConversationMessagesApi(coreConfig);
    this.conversationMessageApi = new ConversationMessageApi(coreConfig);
    this.modelApi = new ModelApi(coreConfig);
    this.modelsApi = new ModelsApi(coreConfig);
    this.searchApi = new SearchApi(coreConfig);
    this.allocationsApi = new AllocationsApi(coreConfig);
    this.applicationApi = new ApplicationApi(coreConfig);
    this.applicationsApi = new ApplicationsApi(coreConfig);
    this.linkifyApi = new LinkifyApi(coreConfig);
    this.assetsApi = new AssetsApi(coreConfig);
    this.formatApi = new FormatApi(coreConfig);
    this.userApi = new UserApi(coreConfig);
    this.osApi = new OSApi(coreConfig);
    this.assetApi = new AssetApi(coreConfig);
    this.DiscoveryApi = new DiscoveryApi(coreConfig);
    this.wellKnownApi = new WellKnownApi(coreConfig);
    this.QGPTApi = new QGPTApi(coreConfig);
    this.annotationsApi = new AnnotationsApi(coreConfig);
    this.annotationApi = new AnnotationApi(coreConfig);
    this.activityApi = new ActivityApi(coreConfig);
    this.activitiesApi = new ActivitiesApi(coreConfig);
    this.tagApi = new TagApi(coreConfig);
    this.websiteApi = new WebsiteApi(coreConfig);
  }

  set context(context: Context) {
    this.apiContext = context;
    this.addApplicationHeaders(context.application.id);
  }

  public static getInstance(): ConnectorSingleton {
    if (!ConnectorSingleton.instance) {
      ConnectorSingleton.instance = new ConnectorSingleton();
    }

    return ConnectorSingleton.instance;
  }

  addApplicationHeaders(application: string) {
    this.createApis(application);
  }

  public static async checkConnection({
    notification = true,
  }: {
    notification?: boolean;
  }): Promise<boolean> {
    try {
      await fetch(`${ConnectorSingleton.getHost()}/.well-known/health`);
      return true;
    } catch (e) {
      const notifications = Notifications.getInstance();
      // if notification is set to false we will ignore and just return false.
      if (notification) {
        notifications.hudNotification("Failed to connect to Pieces");
      }
      return false;
    }
  }
}
