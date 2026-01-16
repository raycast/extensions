import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { OAuthService } from "@raycast/utils";

export interface ExtensionFeatureFlags {
  searchPatternDropdown: boolean;
  disableTelemetry: boolean;
}

export interface Sourcegraph {
  /**
   * URL to the Sourcegraph instance. This URL never contains a trailing slash.
   */
  instance: string;
  /**
   * Token for connecting to this Sourcegraph instance.
   */
  token?: string;
  /**
   * Default search context when searching on this Sourcegraph instance.
   */
  defaultContext?: string;
  /**
   * Client for executing GraphQL requests with.
   */
  client: ApolloClient<NormalizedCacheObject>;

  /**
   * Address of the proxy server to use for requests to the custom Sourcegraph instance.
   */
  proxy?: string;

  /**
   * Feature flags for the extension.
   */
  featureFlags: ExtensionFeatureFlags;

  /**
   * Whether a custom Sourcegraph connection has been configured by the user.
   */
  hasCustomSourcegraphConnection: boolean;

  /**
   * OAuth service for authenticating with the Sourcegraph instance.
   */
  oauth?: OAuthService;

  /**
   * Anonymous user ID for the user.
   */
  anonymousUserID?: string;
}
