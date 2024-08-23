import {
  Configuration,
  ConfigurationParameters,
  ConnectorApi,
  FetchAPI,
  TagApi,
  WebsiteApi,
} from "@pieces.app/pieces-os-client";
import {
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
} from "@pieces.app/pieces-os-client";
import fetch from "node-fetch";

export const portNumber = process.platform == "linux" ? 5323 : 1000;

export default class ConnectorSingleton {
  private static instance: ConnectorSingleton;

  private constructor() {}

  public parameters: ConfigurationParameters = {
    basePath: `http://localhost:${portNumber}`,
    fetchApi: fetch as unknown as FetchAPI,
  };

  public configuration: Configuration = new Configuration(this.parameters);
  public connectorApi: ConnectorApi = new ConnectorApi(this.configuration);

  public tagApi = new TagApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public websiteApi = new WebsiteApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public conversationApi = new ConversationApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public conversationsApi = new ConversationsApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );

  public anchorApi = new AnchorApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public anchorsApi = new AnchorsApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public anchorPointApi = new AnchorPointApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public conversationMessagesApi = new ConversationMessagesApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public conversationMessageApi = new ConversationMessageApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public modelApi = new ModelApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public modelsApi = new ModelsApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public searchApi = new SearchApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public allocationsApi = new AllocationsApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public applicationApi = new ApplicationApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public linkifyApi = new LinkifyApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public assetsApi = new AssetsApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public formatApi = new FormatApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public userApi = new UserApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public osApi = new OSApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public assetApi = new AssetApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public DiscoveryApi = new DiscoveryApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public wellKnownApi = new WellKnownApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public QGPTApi = new QGPTApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public annotationsApi = new AnnotationsApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public annotationApi = new AnnotationApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public activityApi = new ActivityApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );
  public activitiesApi = new ActivitiesApi(
    new CoreConfig({
      fetchApi: fetch as unknown as FetchAPI,
      basePath: this.parameters.basePath,
    }),
  );

  public static getInstance(): ConnectorSingleton {
    if (!ConnectorSingleton.instance) {
      ConnectorSingleton.instance = new ConnectorSingleton();
    }

    return ConnectorSingleton.instance;
  }
}
