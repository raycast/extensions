/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** An ISO 8601-encoded datetime */
  ISO8601DateTime: any;
  /** Represents untyped JSON */
  JSON: any;
};

/** An account represents an organization. */
export type Account = {
  __typename?: 'Account';
  /** Find an alert source by id or external identifier. */
  alertSource: AlertSource;
  /** List all the alert sources for your account. */
  alertSources: AlertSourceConnection;
  /** Find a list of services by many properties. */
  allServices: ServiceConnection;
  /** The default repo path used to fetch API Docs for a service. */
  apiDocsDefaultPath: Scalars['String'];
  /** The integrations available to install for this account. */
  availableIntegrations: Array<AvailableIntegration>;
  /** Find a campaign by id. */
  campaign?: Maybe<Campaign>;
  /** Find a list of campaigns on the account, filterable by different properties. */
  campaigns: CampaignConnection;
  /** Find a category by id. */
  category?: Maybe<Category>;
  /** Find a check by id. */
  check?: Maybe<Check>;
  /** Find OpsLevel config as code definitions. */
  configFile?: Maybe<ConfigFile>;
  /** Find an external action by ID or alias. */
  customActionsExternalAction: CustomActionsExternalAction;
  /** The external actions that can be triggered by custom actions. */
  customActionsExternalActions: CustomActionsExternalActionsConnection;
  /** List all Custom Action templates for your account. */
  customActionsTemplates: Array<CustomActionsTemplate>;
  /** Find a Custom Action Trigger Definition by ID or alias. */
  customActionsTriggerDefinition?: Maybe<CustomActionsTriggerDefinition>;
  /** List all Custom Action Trigger Definitions for your account. */
  customActionsTriggerDefinitions: CustomActionsTriggerDefinitionConnection;
  /** Find a Custom Action Trigger Event by ID. */
  customActionsTriggerEvent?: Maybe<CustomActionsTriggerEvent>;
  /** List all Custom Action Trigger Events for your account. */
  customActionsTriggerEvents: CustomActionsTriggerEventConnection;
  /** List of all deploys for a given service and environment. */
  deploys: DeployConnection;
  /** Find a document by id. */
  document?: Maybe<Document>;
  /** Find a list of documents on the account, filterable by different properties. */
  documents: DocumentConnection;
  /** List all environments for the specified services. */
  environments: Environment;
  /** Evaluate a liquid template against a jq expression and JSON payload. */
  evaluateCheckTemplate: CheckTemplatePayload;
  /** Export an object as YAML. */
  exportObject: ExportConfigFilePayload;
  /** Find a filter by id. */
  filter?: Maybe<Filter>;
  /** List all filters for your account. */
  filters?: Maybe<FilterConnection>;
  /** Find a group by its id or alias. */
  group?: Maybe<Group>;
  /** List all groups for your account. */
  groups: GroupConnection;
  /** Whether or not the account has at least one deploy integration. */
  hasDeployIntegrations: Scalars['Boolean'];
  /** Whether or not deploys exist within the account. */
  hasDeploys: Scalars['Boolean'];
  /** Whether or not the account has at least one monitoring integration. */
  hasMonitoringIntegrations: Scalars['Boolean'];
  /** The unique identifier for the account. */
  id: Scalars['ID'];
  /** A list of Infrastructure Resources. */
  infrastructureResources?: Maybe<InfrastructureResourceConnection>;
  /** Find an integration by id. */
  integration?: Maybe<Integration>;
  /** List of all Integrations for your account. */
  integrations: IntegrationConnection;
  /**
   * Find the latest check result for a given service and check.
   * @deprecated `latestCheckResult` is now deprecated. Please, use `ServiceHealthReport.latestCheckResults` instead.
   */
  latestCheckResult?: Maybe<CheckResult>;
  /** Find a level by id. */
  level?: Maybe<Level>;
  /** List all lifecycles for your account. */
  lifecycles: Array<Lifecycle>;
  /** The display name of the account. */
  name: Scalars['String'];
  /** The notifications available for your account. */
  notifications: NotificationConnection;
  /** List all payloads for your account. */
  payloads: PayloadConnection;
  /** List all repositories for your account. */
  repositories: RepositoryConnection;
  /** Find a repository by its id. */
  repository?: Maybe<Repository>;
  /** Performs a search on a repository */
  repositorySearch: RepositorySearchResult;
  /** Find the rubric for an account. This also group rubric-related data like levels e categories. */
  rubric: Rubric;
  /** Get recommended number of instances to run in an OpsLevel Runner group of pods based on queue of available jobs. */
  runnerScale: RunnerScale;
  /** Find a service by its id or alias. */
  service?: Maybe<Service>;
  /** Check if detected service entries exist for an alias. */
  serviceAliasHasHistoricalEvents: Scalars['Boolean'];
  /** All of the service dependency directed edges for the account */
  serviceDependencies: Array<ServiceDependency>;
  /** Find a service template by its ID */
  serviceTemplate?: Maybe<ServiceTemplate>;
  /** Represents the use of a service template with a particular set of inputs to generate a new service. */
  serviceTemplateRun?: Maybe<ServiceTemplateRun>;
  /** List all service templates for your account. */
  serviceTemplates: ServiceTemplateConnection;
  /** Find a list of services by many properties. */
  services: ServiceConnection;
  /** Find data used in service reports. */
  servicesReport: ServicesReport;
  /** Find a list of services by many properties. */
  servicesV2: ServiceConnection;
  /** List all Slack channels for your account's Slack integration. */
  slackChannels: Array<Scalars['String']>;
  /** translation missing: en.graphql.types.account.subscriptions.self */
  subscriptions: SubscriptionConnection;
  /** List all suggestion activity for your account. */
  suggestionActivities: SuggestionActivityConnection;
  /** List all suggestions for your account. */
  suggestions: SuggestionConnection;
  /** List all tags for your account */
  tags: TagConnection;
  /** Find a team by its id or alias. */
  team?: Maybe<Team>;
  /** Find a list of teams by many properties. */
  teams: TeamConnection;
  /** List of third party integrations available for your account. */
  thirdPartyIntegrations: Array<ThirdPartyIntegration>;
  /** List all tiers for your account. */
  tiers: Array<Tier>;
  /** List all tools for a given service. Filterable by environment. */
  tools: ToolConnection;
  /** Find a user by its id. */
  user?: Maybe<User>;
  /** Find a list of users by many properties. */
  users: UserConnection;
};


/** An account represents an organization. */
export type AccountAlertSourceArgs = {
  externalIdentifier?: InputMaybe<AlertSourceExternalIdentifier>;
  id?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountAlertSourcesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
};


/** An account represents an organization. */
export type AccountAllServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  category?: InputMaybe<CategoryFilterInput>;
  connective?: InputMaybe<ConnectiveEnum>;
  filter?: InputMaybe<Array<ServiceFilterInput>>;
  filterId?: InputMaybe<Scalars['ID']>;
  first?: InputMaybe<Scalars['Int']>;
  framework?: InputMaybe<Scalars['String']>;
  language?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  lifecycleAlias?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  ownerAlias?: InputMaybe<Scalars['String']>;
  product?: InputMaybe<Scalars['String']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  serviceId?: InputMaybe<Scalars['ID']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
  tag?: InputMaybe<TagArgs>;
  tierAlias?: InputMaybe<Scalars['String']>;
};


/** An account represents an organization. */
export type AccountAvailableIntegrationsArgs = {
  categories?: InputMaybe<Array<IntegrationCategoryEnum>>;
  searchTerm?: InputMaybe<Scalars['String']>;
};


/** An account represents an organization. */
export type AccountCampaignArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountCampaignsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  campaignIds?: InputMaybe<Array<Scalars['ID']>>;
  connective?: InputMaybe<ConnectiveEnum>;
  filter?: InputMaybe<Array<CampaignFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  serviceId?: InputMaybe<Scalars['ID']>;
  sortBy?: InputMaybe<CampaignSortEnum>;
  userId?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountCategoryArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountCheckArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountConfigFileArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountCustomActionsExternalActionArgs = {
  input: IdentifierInput;
};


/** An account represents an organization. */
export type AccountCustomActionsExternalActionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** An account represents an organization. */
export type AccountCustomActionsTriggerDefinitionArgs = {
  input: IdentifierInput;
};


/** An account represents an organization. */
export type AccountCustomActionsTriggerDefinitionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  associatedObject?: InputMaybe<IdentifierInput>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<CustomActionsTriggerDefinitionFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  globalActionsOnly?: InputMaybe<Scalars['Boolean']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<CustomActionsTriggerDefinitionSortEnum>;
};


/** An account represents an organization. */
export type AccountCustomActionsTriggerEventArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountCustomActionsTriggerEventsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<CustomActionsTriggerEventFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<CustomActionsTriggerEventSortEnum>;
};


/** An account represents an organization. */
export type AccountDeploysArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  end: Scalars['ISO8601DateTime'];
  environments?: InputMaybe<Array<Scalars['String']>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  providers?: InputMaybe<Array<Scalars['ID']>>;
  serviceId?: InputMaybe<IdentifierInput>;
  start: Scalars['ISO8601DateTime'];
};


/** An account represents an organization. */
export type AccountDocumentArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountDocumentsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm: Scalars['String'];
  sortBy?: InputMaybe<DocumentSortEnum>;
  type?: InputMaybe<DocumentTypeEnum>;
};


/** An account represents an organization. */
export type AccountEnvironmentsArgs = {
  query?: InputMaybe<Scalars['String']>;
  services?: InputMaybe<Array<Scalars['ID']>>;
};


/** An account represents an organization. */
export type AccountEvaluateCheckTemplateArgs = {
  data: Scalars['JSON'];
  expression: Scalars['String'];
  sampleQueryParams?: InputMaybe<Scalars['String']>;
  serviceSelector?: InputMaybe<Scalars['String']>;
  template: Scalars['String'];
  usesCtxAndParamsVariables?: InputMaybe<Scalars['Boolean']>;
};


/** An account represents an organization. */
export type AccountExportObjectArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountFilterArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountFiltersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
};


/** An account represents an organization. */
export type AccountGroupArgs = {
  alias?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountGroupsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<GroupFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<GroupSortEnum>;
};


/** An account represents an organization. */
export type AccountInfrastructureResourcesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** An account represents an organization. */
export type AccountIntegrationArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountIntegrationsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<IntegrationSortEnum>;
  type?: InputMaybe<Scalars['String']>;
};


/** An account represents an organization. */
export type AccountLatestCheckResultArgs = {
  checkId: Scalars['ID'];
  service: IdentifierInput;
};


/** An account represents an organization. */
export type AccountLevelArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountNotificationsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  subscriberType?: InputMaybe<SubscriberTypeEnum>;
};


/** An account represents an organization. */
export type AccountPayloadsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<PayloadFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<PayloadSortEnum>;
};


/** An account represents an organization. */
export type AccountRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<RepositoryFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<RepositorySortEnum>;
  tierAlias?: InputMaybe<Scalars['String']>;
  visible?: InputMaybe<Scalars['Boolean']>;
};


/** An account represents an organization. */
export type AccountRepositoryArgs = {
  alias?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountRepositorySearchArgs = {
  id: Scalars['ID'];
  search: CheckRepositorySearchInput;
};


/** An account represents an organization. */
export type AccountRunnerScaleArgs = {
  currentReplicaCount: Scalars['Int'];
  jobConcurrency: Scalars['Int'];
  runnerId: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountServiceArgs = {
  alias?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountServiceAliasHasHistoricalEventsArgs = {
  alias: Scalars['String'];
};


/** An account represents an organization. */
export type AccountServiceTemplateArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountServiceTemplateRunArgs = {
  id: Scalars['ID'];
};


/** An account represents an organization. */
export type AccountServiceTemplatesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** An account represents an organization. */
export type AccountServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  category?: InputMaybe<CategoryFilterInput>;
  connective?: InputMaybe<ConnectiveEnum>;
  filter?: InputMaybe<Array<ServiceFilterInput>>;
  filterId?: InputMaybe<Scalars['ID']>;
  first?: InputMaybe<Scalars['Int']>;
  framework?: InputMaybe<Scalars['String']>;
  language?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  lifecycleAlias?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  ownerAlias?: InputMaybe<Scalars['String']>;
  product?: InputMaybe<Scalars['String']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  serviceId?: InputMaybe<Scalars['ID']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
  tag?: InputMaybe<TagArgs>;
  tierAlias?: InputMaybe<Scalars['String']>;
};


/** An account represents an organization. */
export type AccountServicesReportArgs = {
  connective?: InputMaybe<ConnectiveEnum>;
  filter?: InputMaybe<Array<ServiceFilterInput>>;
  filterId?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountServicesV2Args = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
};


/** An account represents an organization. */
export type AccountSubscriptionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  type?: InputMaybe<SubscriberTypeEnum>;
};


/** An account represents an organization. */
export type AccountSuggestionActivitiesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<SuggestionActivityFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<SuggestionActivitySortEnum>;
};


/** An account represents an organization. */
export type AccountSuggestionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<SuggestionFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<SuggestionSortEnum>;
};


/** An account represents an organization. */
export type AccountTagsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  ownerType: TagOwnerTypeEnum;
};


/** An account represents an organization. */
export type AccountTeamArgs = {
  alias?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountTeamsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  groupIds?: InputMaybe<Array<Scalars['ID']>>;
  ids?: InputMaybe<Array<Scalars['ID']>>;
  last?: InputMaybe<Scalars['Int']>;
  managerEmail?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<TeamSortEnum>;
};


/** An account represents an organization. */
export type AccountToolsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  environment?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  service?: InputMaybe<Scalars['ID']>;
};


/** An account represents an organization. */
export type AccountUserArgs = {
  input?: InputMaybe<UserIdentifierInput>;
};


/** An account represents an organization. */
export type AccountUsersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<UsersFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<UsersSortEnum>;
};

/** An alert source that is currently integrated and belongs to the account. */
export type AlertSource = {
  __typename?: 'AlertSource';
  /** The description of the alert source. */
  description?: Maybe<Scalars['String']>;
  /** The external id of the alert. */
  externalId: Scalars['String'];
  /** The id of the alert source. */
  id: Scalars['ID'];
  /** The integration of the alert source. */
  integration?: Maybe<Integration>;
  /** The metadata of the alert source. */
  metadata?: Maybe<Scalars['String']>;
  /** The name of the alert source. */
  name: Scalars['String'];
  /** AlertSourceService connections. Edges between AlertSource and Service that contain the status. */
  services?: Maybe<AlertSourceServiceConnection>;
  /** The type of the alert. */
  type: AlertSourceTypeEnum;
  /** The url to the alert source. */
  url?: Maybe<Scalars['String']>;
};


/** An alert source that is currently integrated and belongs to the account. */
export type AlertSourceServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  serviceIds?: InputMaybe<Array<Scalars['ID']>>;
};

/** The connection type for AlertSource. */
export type AlertSourceConnection = {
  __typename?: 'AlertSourceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<AlertSourceEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<AlertSource>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type AlertSourceEdge = {
  __typename?: 'AlertSourceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<AlertSource>;
};

/** Specifies the input needed to find an alert source with external information. */
export type AlertSourceExternalIdentifier = {
  /** The external id of the alert. */
  externalId: Scalars['String'];
  /** The type of the alert. */
  type: AlertSourceTypeEnum;
};

/** An alert source that is connected with a service. */
export type AlertSourceService = {
  __typename?: 'AlertSourceService';
  /** The alert source that is mapped to a service */
  alertSource: AlertSource;
  /** id of the alert_source_service mapping. */
  id: Scalars['ID'];
  /** The service the alert source maps to. */
  service: Service;
  /** The status of the alert source. */
  status: AlertSourceStatusTypeEnum;
};

/** The connection type for AlertSource. */
export type AlertSourceServiceConnection = {
  __typename?: 'AlertSourceServiceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<AlertSourceServiceEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<AlertSource>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input used for attaching an alert source to a service. */
export type AlertSourceServiceCreateInput = {
  /** Specifies the input needed to find an alert source with external information. */
  alertSourceExternalIdentifier?: InputMaybe<AlertSourceExternalIdentifier>;
  /** Specifies the input needed to find an alert source with external information. */
  alertSourceId?: InputMaybe<Scalars['ID']>;
  /** The service that the alert source will be attached to. */
  service: IdentifierInput;
};

/** Return type for the `alertSourceServiceCreate` mutation. */
export type AlertSourceServiceCreatePayload = {
  __typename?: 'AlertSourceServiceCreatePayload';
  /** An alert source service representing a connection between a service and an alert source. */
  alertSourceService?: Maybe<AlertSourceService>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used in the `alertSourceServiceDelete` mutation. */
export type AlertSourceServiceDeleteInput = {
  /** The id of the alert source service to be deleted. */
  id: Scalars['ID'];
};

/** Return type for the `alertSourceServiceDelete` mutation. */
export type AlertSourceServiceDeletePayload = {
  __typename?: 'AlertSourceServiceDeletePayload';
  /** The id of the deleted alert source service. */
  deletedAlertSourceServiceId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type AlertSourceServiceEdge = {
  __typename?: 'AlertSourceServiceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The id of the edge. */
  id: Scalars['ID'];
  /** Whether or not this alert source connection is managed by an external resource. */
  locked: Scalars['Boolean'];
  /** The url of the external resource locking this alert source connection. */
  lockerUrl?: Maybe<Scalars['String']>;
  /** The item at the end of the edge. */
  node?: Maybe<AlertSource>;
  /** The status of the alert source for the given service. */
  status?: Maybe<Scalars['String']>;
};

/** Specifies the input used for attaching alert sources to a service. */
export type AlertSourceServicesCreateInput = {
  /** The ids of the alert sources. */
  alertSourceIds: Array<Scalars['ID']>;
  /** The service that the alert source will be attached to. */
  service: IdentifierInput;
};

/** Return type for the `alertSourceServicesCreate` mutation. */
export type AlertSourceServicesCreatePayload = {
  __typename?: 'AlertSourceServicesCreatePayload';
  /** An array of alert sources that are connected with a service. */
  alertSourceServices?: Maybe<Array<AlertSourceService>>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Sort possibilities for alert sources. */
export enum AlertSourceSortEnum {
  /** Sort by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Sort by `name` descending. */
  NameDesc = 'name_DESC',
  /** Sort by `status` ascending. */
  StatusAsc = 'status_ASC',
  /** Sort by `status` descending. */
  StatusDesc = 'status_DESC',
  /** Sort by `type` ascending. */
  TypeAsc = 'type_ASC',
  /** Sort by `type` descending. */
  TypeDesc = 'type_DESC'
}

/** The monitor status level. */
export enum AlertSourceStatusTypeEnum {
  /** Monitor is reporting an alert. */
  Alert = 'alert',
  /** Monitor currently being updated. */
  FetchingData = 'fetching_data',
  /** No data received yet. Ensure your monitors are configured correctly. */
  NoData = 'no_data',
  /** Monitor is not reporting any warnings or alerts. */
  Ok = 'ok',
  /** Monitor is reporting a warning. */
  Warn = 'warn'
}

/** The type of the alert source. */
export enum AlertSourceTypeEnum {
  /** A Datadog alert source (aka monitor). */
  Datadog = 'datadog',
  /** An Opsgenie alert source (aka service) */
  Opsgenie = 'opsgenie',
  /** A PagerDuty alert source (aka service). */
  Pagerduty = 'pagerduty'
}

export type AlertSourceUsageCheck = Check & {
  __typename?: 'AlertSourceUsageCheck';
  /** The condition that the alert source name should satisfy to be evaluated. */
  alertSourceNamePredicate?: Maybe<Predicate>;
  /** The type of the alert source. */
  alertSourceType?: Maybe<AlertSourceTypeEnum>;
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** The status of the service based on the current alerts. */
export type AlertStatus = {
  __typename?: 'AlertStatus';
  /** The alert status index. */
  index: Scalars['Int'];
  /** The alert status type. */
  type: AlertStatusTypeEnum;
};

/** The monitor status level. */
export enum AlertStatusTypeEnum {
  /** Monitor is reporting an alert. */
  Alert = 'alert',
  /** Not received data yet. Ensure your monitors are configured correctly. */
  NoData = 'no_data',
  /** There are no warnings or alerts. */
  Ok = 'ok',
  /** Monitor is reporting a warning. */
  Warn = 'warn'
}

/** An alias is a human-friendly, unique identifier for the resource. */
export type Alias = {
  __typename?: 'Alias';
  /** Whether or not the alias can be deleted. */
  locked: Scalars['Boolean'];
  /** The alias itself. */
  value: Scalars['String'];
};

/** The input for the `aliasCreate` mutation. */
export type AliasCreateInput = {
  /** The alias you wish to create. */
  alias: Scalars['String'];
  /** If true, attach events recorded before this alias was created (if any). */
  attachHistoricalEvents?: InputMaybe<Scalars['Boolean']>;
  /** The ID of the resource you want to create the alias on. Services and teams are supported. */
  ownerId: Scalars['String'];
};

/** Return type for the `aliasCreate` mutation. */
export type AliasCreatePayload = {
  __typename?: 'AliasCreatePayload';
  /** All of the aliases attached to the resource. */
  aliases?: Maybe<Array<Scalars['String']>>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The ID of the resource that had an alias attached. */
  ownerId?: Maybe<Scalars['String']>;
};

/** The input for the `aliasDelete` mutation. */
export type AliasDeleteInput = {
  /** The alias you wish to delete. */
  alias: Scalars['String'];
  /** The resource the alias you wish to delete belongs to. */
  ownerType: AliasOwnerTypeEnum;
};

/** Return type for the `aliasDelete` mutation. */
export type AliasDeletePayload = {
  __typename?: 'AliasDeletePayload';
  /** The deleted alias. */
  deletedAlias?: Maybe<Scalars['String']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** The owner type an alias is assigned to. */
export enum AliasOwnerTypeEnum {
  /** Aliases that are assigned to services. */
  Service = 'service',
  /** Aliases that are assigned to teams. */
  Team = 'team'
}

/** The connection type for Group. */
export type AncestorGroupsConnection = {
  __typename?: 'AncestorGroupsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<AncestorGroupsEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Group>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type AncestorGroupsEdge = {
  __typename?: 'AncestorGroupsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Group>;
};

export type ApiDocIntegration = Integration & {
  __typename?: 'ApiDocIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** The source used to determine the preferred API document. */
export enum ApiDocumentSourceEnum {
  /** Use the document that was pulled by OpsLevel via a repo. */
  Pull = 'PULL',
  /** Use the document that was pushed to OpsLevel via an API Docs integration. */
  Push = 'PUSH'
}

/** Represents an Artifact (usually a blob record). */
export type Artifact = {
  __typename?: 'Artifact';
  /** The remote URL where the artifact can be downloaded. */
  url?: Maybe<Scalars['String']>;
};

export type AvailableIntegration = {
  __typename?: 'AvailableIntegration';
  /** The categories of the integration. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The displayable name for an available integration. */
  displayName: Scalars['String'];
  /** The URL to visit to start the installation process for this integration. */
  installUrl: Scalars['String'];
};

export type AwsIntegration = Integration & {
  __typename?: 'AwsIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** All of the aliases attached to the resource. */
  aliases: Array<Scalars['String']>;
  /** Allow tags imported from AWS to override ownership set in OpsLevel directly. */
  awsTagsOverrideOwnership: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /**
   * The External ID defined in the trust relationship to ensure OpsLevel is the
   * only third party assuming this role (See https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
   * for more details).
   */
  externalId: Scalars['String'];
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The IAM role OpsLevel uses in order to access the AWS account. */
  iamRole: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time the Integration last imported data from AWS. */
  lastSyncedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** An Array of tag keys used to associate ownership from an integration. Max 5 */
  ownershipTagKeys: Array<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** Specifies the input fields used in the `awsIntegrationCreate` mutation. */
export type AwsIntegrationCreateInput = {
  /**
   * The External ID defined in the trust relationship to ensure OpsLevel is the
   * only third party assuming this role (See https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
   * for more details).
   */
  externalId: Scalars['String'];
  /** The IAM role OpsLevel uses in order to access the AWS account. */
  iamRole: Scalars['String'];
  /** An Array of tag keys used to associate ownership from an integration. Max 5 */
  ownershipTagKeys?: InputMaybe<Array<Scalars['String']>>;
};

/** Return type for the `awsIntegrationCreate` mutation. */
export type AwsIntegrationCreatePayload = {
  __typename?: 'AwsIntegrationCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly created AWS integration. */
  integration?: Maybe<AwsIntegration>;
};

/** Specifies the input fields used in the `awsIntegrationUpdate` mutation. */
export type AwsIntegrationUpdateInput = {
  /** Allow tags imported from AWS to override ownership set in OpsLevel directly. */
  awsTagsOverrideOwnership?: InputMaybe<Scalars['Boolean']>;
  /**
   * The External ID defined in the trust relationship to ensure OpsLevel is the
   * only third party assuming this role (See https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
   * for more details).
   */
  externalId?: InputMaybe<Scalars['String']>;
  /** The IAM role OpsLevel uses in order to access the AWS account. */
  iamRole?: InputMaybe<Scalars['String']>;
  integration: IdentifierInput;
  /** An Array of tag keys used to associate ownership from an integration. Max 5 */
  ownershipTagKeys?: InputMaybe<Array<Scalars['String']>>;
};

/** Return type for the `awsIntegrationUpdate` mutation. */
export type AwsIntegrationUpdatePayload = {
  __typename?: 'AwsIntegrationUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The updated AWS integration. */
  integration?: Maybe<AwsIntegration>;
};

export type AzureDevopsIntegration = Integration & {
  __typename?: 'AzureDevopsIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** The Azure DevOps integration's supported capabilities */
  capabilities: Array<GitForgeCapabilitiesTypeEnum>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** Operations that can be used on filters. */
export enum BasicTypeEnum {
  /** Does not equal a specific value. */
  DoesNotEqual = 'does_not_equal',
  /** Equals a specific value. */
  Equals = 'equals'
}

export type BitbucketIntegration = Integration & {
  __typename?: 'BitbucketIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** The Bitbucket integration's supported capabilities */
  capabilities: Array<GitForgeCapabilitiesTypeEnum>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
export type Campaign = {
  __typename?: 'Campaign';
  /** Historical values of the campaign's completion statistics. */
  campaignStatsHistory?: Maybe<Array<CampaignStatsHistory>>;
  /** translation missing: en.graphql.types.campaign.campaign_stats_updated_at */
  campaignStatsUpdatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** True if this deployment of OpsLevel is capable of sending messages to service owners. */
  canSendReminders: Scalars['Boolean'];
  /** A summary of check results on the campaign. */
  checkStats?: Maybe<Stats>;
  /** The checks of the campaign. */
  checks?: Maybe<CheckConnection>;
  /** The date the campaign ended. */
  endedDate?: Maybe<Scalars['ISO8601DateTime']>;
  /** The filter that the campaign belongs to. */
  filter?: Maybe<Filter>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The id of the campaign. */
  id: Scalars['ID'];
  /** The name of the campaign. */
  name: Scalars['String'];
  /** The team that owns the campaign. */
  owner?: Maybe<Team>;
  /** The project brief of the campaign. */
  projectBrief?: Maybe<Scalars['String']>;
  /** The raw unsanitized project brief of the campaign. */
  rawProjectBrief?: Maybe<Scalars['String']>;
  /** The datetime the campaign report was last updated. */
  reportUpdatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** A summary of services that completed the campaign. */
  serviceStats?: Maybe<Stats>;
  /** The services impacted by the campaign (through the campaign filter) */
  services: ServiceConnection;
  /** The date the campaign will start. */
  startDate?: Maybe<Scalars['ISO8601DateTime']>;
  /** The status of the campaign. */
  status: CampaignStatusEnum;
  /** The target date the campaign should end. */
  targetDate?: Maybe<Scalars['ISO8601DateTime']>;
  /** The teams impacted by the campaign (through services). */
  teams: CampaignTeamConnection;
};


/** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
export type CampaignChecksArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
export type CampaignServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
};


/** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
export type CampaignTeamsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  campaignProgress?: InputMaybe<CampaignServiceStatusEnum>;
  first?: InputMaybe<Scalars['Int']>;
  hasContact?: InputMaybe<Scalars['Boolean']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for CheckResult. */
export type CampaignCheckResultsConnection = {
  __typename?: 'CampaignCheckResultsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CampaignCheckResultsEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CheckResult>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
  /** The total number of failed checks on the service for the campaign. */
  totalFailingCount?: Maybe<Scalars['Int']>;
};

/** An edge in a connection. */
export type CampaignCheckResultsEdge = {
  __typename?: 'CampaignCheckResultsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CheckResult>;
};

/** The connection type for Campaign. */
export type CampaignConnection = {
  __typename?: 'CampaignConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CampaignEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Campaign>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used to create a campaign. */
export type CampaignCreateInput = {
  /** The IDs of the existing rubric checks to be copied. */
  checkIdsToCopy?: InputMaybe<Array<Scalars['ID']>>;
  /** The ID of the filter applied to this campaign. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The name of the campaign. */
  name: Scalars['String'];
  /** The ID of the team that owns this campaigns. */
  ownerId: Scalars['ID'];
  /** The project brief of the campaign. */
  projectBrief?: InputMaybe<Scalars['String']>;
};

/** The return type of a `campaignCreate` mutation. */
export type CampaignCreatePayload = {
  __typename?: 'CampaignCreatePayload';
  /** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
  campaign?: Maybe<Campaign>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type CampaignEdge = {
  __typename?: 'CampaignEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Campaign>;
};

/** Specifies the input fields used to end a campaign and promote checks to the rubric. */
export type CampaignEndInput = {
  /** The list of campaign checks to be promoted to the rubric. */
  checksToPromote?: InputMaybe<Array<CheckToPromoteInput>>;
  /** he ID of the campaign to be ended. */
  id: Scalars['ID'];
};

/** The return type of a `campaignEnd` mutation. */
export type CampaignEndPayload = {
  __typename?: 'CampaignEndPayload';
  /** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
  campaign?: Maybe<Campaign>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The list of checks that were promoted to the rubric. */
  promotedChecks?: Maybe<Array<Check>>;
};

/** Fields that can be used as part of filter for campaigns. */
export enum CampaignFilterEnum {
  /** Filter by `id` of campaign. */
  Id = 'id',
  /** Filter by campaign owner. */
  Owner = 'owner',
  /** Filter by campaign status. */
  Status = 'status'
}

/** Input to be used to filter campaigns. */
export type CampaignFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** The logical operator to be used in conjunction with multiple filters (requires predicates to be supplied). */
  connective?: InputMaybe<ConnectiveEnum>;
  /** Field to be filtered. */
  key?: InputMaybe<CampaignFilterEnum>;
  /** A list of campaign filter input. */
  predicates?: InputMaybe<Array<CampaignFilterInput>>;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Type/Format of the notification. */
export enum CampaignReminderTypeEnum {
  /** Notification will be sent via email. */
  Email = 'email',
  /** Notification will be sent by slack. */
  Slack = 'slack'
}

/** Report of how a service is performing against all its associated campaigns. */
export type CampaignReport = {
  __typename?: 'CampaignReport';
  /** The check results of the service grouped by campaign. */
  checkResultsByCampaign?: Maybe<CheckResultsByCampaignConnection>;
};


/** Report of how a service is performing against all its associated campaigns. */
export type CampaignReportCheckResultsByCampaignArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** Specifies the input fields used to update a campaign schedule. */
export type CampaignScheduleUpdateInput = {
  /** The id of the campaign to be updated. */
  id: Scalars['ID'];
  /** The date the campaign will start. */
  startDate: Scalars['ISO8601DateTime'];
  /** The target date the campaign should end. */
  targetDate: Scalars['ISO8601DateTime'];
};

/** The return type of a `campaignScheduleUpdate` mutation. */
export type CampaignScheduleUpdatePayload = {
  __typename?: 'CampaignScheduleUpdatePayload';
  /** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
  campaign?: Maybe<Campaign>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used to coordinate sending notifications to team members about a campaign. */
export type CampaignSendReminderInput = {
  /** A custom message to include in the notification. */
  customMessage?: InputMaybe<Scalars['String']>;
  /** The ID of the campaign about which to notify team members. */
  id: Scalars['ID'];
  /** The list of the types of notifications to be sent. */
  reminderTypes: Array<CampaignReminderTypeEnum>;
  /** The list of team ids to receive the notifications. */
  teamIds?: InputMaybe<Array<Scalars['ID']>>;
};

/** Summarizes list of teams returned from attempt to send reminders for their failed campaigns. */
export type CampaignSendReminderOutcomeTeams = {
  __typename?: 'CampaignSendReminderOutcomeTeams';
  /** The reminder type linked to the attempt at notifying the listed teams. */
  reminderType: CampaignReminderTypeEnum;
  /** List of team_ids in this group of teams. */
  teamIds?: Maybe<Array<Scalars['ID']>>;
  /** Count of number of teams listed. */
  totalCount: Scalars['Int'];
};

/** The return type of a `campaignSendReminder` mutation. */
export type CampaignSendReminderPayload = {
  __typename?: 'CampaignSendReminderPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** List and count of teams being notified, grouped by reminder type. */
  teamsBeingNotified?: Maybe<Array<CampaignSendReminderOutcomeTeams>>;
  /** Total count of teams being notified, across all reminder types. */
  teamsBeingNotifiedCount: Scalars['Int'];
  /** List and count of teams missing required contact method, grouped by reminder type. */
  teamsMissingContactMethod?: Maybe<Array<CampaignSendReminderOutcomeTeams>>;
  /** Total count of teams that had a missing contact method from the required reminder types. */
  teamsMissingContactMethodCount: Scalars['Int'];
};

/** Status of whether a service is passing all checks for a campaign or not. */
export enum CampaignServiceStatusEnum {
  /** Service is failing one or more checks in the campaign. */
  Failing = 'failing',
  /** Service is passing all the checks in the campaign. */
  Passing = 'passing'
}

/** Sort possibilities for campaigns. */
export enum CampaignSortEnum {
  /** Sort by number of `checks passing` ascending. */
  ChecksPassingAsc = 'checks_passing_ASC',
  /** Sort by number of `checks passing` descending. */
  ChecksPassingDesc = 'checks_passing_DESC',
  /** Sort by `endedDate` ascending. */
  EndedDateAsc = 'ended_date_ASC',
  /** Sort by `endedDate` descending. */
  EndedDateDesc = 'ended_date_DESC',
  /** Sort by `filter` ascending. */
  FilterAsc = 'filter_ASC',
  /** Sort by `filter` descending. */
  FilterDesc = 'filter_DESC',
  /** Sort by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Sort by `name` descending. */
  NameDesc = 'name_DESC',
  /** Sort by `owner` ascending. */
  OwnerAsc = 'owner_ASC',
  /** Sort by `owner` descending. */
  OwnerDesc = 'owner_DESC',
  /** Sort by number of `services complete` ascending. */
  ServicesCompleteAsc = 'services_complete_ASC',
  /** Sort by number of `services complete` descending. */
  ServicesCompleteDesc = 'services_complete_DESC',
  /** Sort by `startDate` ascending. */
  StartDateAsc = 'start_date_ASC',
  /** Sort by `startDate` descending. */
  StartDateDesc = 'start_date_DESC',
  /** Sort by `status` ascending. */
  StatusAsc = 'status_ASC',
  /** Sort by `status` descending. */
  StatusDesc = 'status_DESC',
  /** Sort by `targetDate` ascending. */
  TargetDateAsc = 'target_date_ASC',
  /** Sort by `targetDate` descending. */
  TargetDateDesc = 'target_date_DESC'
}

/** Historical value of campaign stats. */
export type CampaignStatsHistory = {
  __typename?: 'CampaignStatsHistory';
  /** Proportion of services that are passing all the campaign's checks. */
  serviceStats?: Maybe<Stats>;
  /** Timestamp for when the stats were valid. */
  timestamp: Scalars['ISO8601DateTime'];
};

/** The campaign status. */
export enum CampaignStatusEnum {
  /** Campaign is delayed. */
  Delayed = 'delayed',
  /** Campaign has been created but is not yet active. */
  Draft = 'draft',
  /** Campaign ended. */
  Ended = 'ended',
  /** Campaign is in progress. */
  InProgress = 'in_progress',
  /** Campaign has been scheduled to begin in the future. */
  Scheduled = 'scheduled'
}

/** Team from the campaign context. */
export type CampaignTeam = {
  __typename?: 'CampaignTeam';
  /** The team impacted by the campaign. */
  team: Team;
};

/** The connection type for CampaignTeam. */
export type CampaignTeamConnection = {
  __typename?: 'CampaignTeamConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CampaignTeamEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CampaignTeam>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type CampaignTeamEdge = {
  __typename?: 'CampaignTeamEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CampaignTeam>;
};

/** Specifices the input fields used to unschedule a campaign. */
export type CampaignUnscheduleInput = {
  /** The id of the campaign to be unscheduled. */
  id: Scalars['ID'];
};

/** The return type of a `campaignUnschedule` mutation. */
export type CampaignUnschedulePayload = {
  __typename?: 'CampaignUnschedulePayload';
  /** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
  campaign?: Maybe<Campaign>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used to update a campaign. */
export type CampaignUpdateInput = {
  /** The ID of the filter applied to this campaign. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the campaign to be updated. */
  id: Scalars['ID'];
  /** The name of the campaign. */
  name?: InputMaybe<Scalars['String']>;
  /** The ID of the team that owns this campaigns. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The project brief of the campaign. */
  projectBrief?: InputMaybe<Scalars['String']>;
};

/** The return type of a `campaignUpdate` mutation. */
export type CampaignUpdatePayload = {
  __typename?: 'CampaignUpdatePayload';
  /** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
  campaign?: Maybe<Campaign>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** A category is used to group related checks in a rubric. */
export type Category = {
  __typename?: 'Category';
  /** The human-friendly, unique identifier for the category. */
  alias: Scalars['String'];
  /** The description of the category. */
  description?: Maybe<Scalars['String']>;
  /** The unique identifier for the category. */
  id: Scalars['ID'];
  /** The rubric levels of the category. */
  levels: Array<Level>;
  /** The display name of the category. */
  name: Scalars['String'];
};

/** The connection type for Category. */
export type CategoryConnection = {
  __typename?: 'CategoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CategoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Category>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used to create a category. */
export type CategoryCreateInput = {
  /** The description of the category. */
  description?: InputMaybe<Scalars['String']>;
  /** The display name of the category. */
  name: Scalars['String'];
};

/** The return type of the `categoryCreate` mutation. */
export type CategoryCreatePayload = {
  __typename?: 'CategoryCreatePayload';
  /** A category is used to group related checks in a rubric. */
  category?: Maybe<Category>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used to delete a category. */
export type CategoryDeleteInput = {
  /** The id of the category to be deleted. */
  id: Scalars['ID'];
};

/** The return type of the `categoryDelete` mutation. */
export type CategoryDeletePayload = {
  __typename?: 'CategoryDeletePayload';
  /** The id of the deleted category. */
  deletedCategoryId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type CategoryEdge = {
  __typename?: 'CategoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Category>;
};

/** Input to be used to filter services by a category and optional levels. */
export type CategoryFilterInput = {
  /** The id of the category. */
  id: Scalars['ID'];
  /** The indexes of the service levels of the category. */
  levelIndexes?: InputMaybe<Array<Scalars['Int']>>;
};

/** The level of a specific category. */
export type CategoryLevel = {
  __typename?: 'CategoryLevel';
  /** A category is used to group related checks in a rubric. */
  category: Category;
  /** A performance rating that is used to grade your services against. */
  level?: Maybe<Level>;
};

/** The total number of services in each level of each category. */
export type CategoryLevelCount = {
  __typename?: 'CategoryLevelCount';
  /** A category is used to group related checks in a rubric. */
  category?: Maybe<Category>;
  /** A performance rating that is used to grade your services against. */
  level: Level;
  /** The number of services. */
  serviceCount: Scalars['Int'];
};

/** Specifies the input fields used to update a category. */
export type CategoryUpdateInput = {
  /** The description of the category. */
  description?: InputMaybe<Scalars['String']>;
  /** The id of the category to be updated. */
  id: Scalars['ID'];
  /** The display name of the category. */
  name?: InputMaybe<Scalars['String']>;
};

/** The return type of the `categoryUpdate` mutation. */
export type CategoryUpdatePayload = {
  __typename?: 'CategoryUpdatePayload';
  /** A category is used to group related checks in a rubric. */
  category?: Maybe<Category>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Channel for a notification. */
export type Channel = {
  __typename?: 'Channel';
  /** The delivery channel. */
  channel: NotificationChannelTypeEnum;
  /** translation missing: en.graphql.types.channel.external_address */
  externalAddress?: Maybe<Scalars['String']>;
  /** The ID for the channel. */
  id: Scalars['ID'];
  /** translation missing: en.graphql.types.channel.target_href */
  targetHref?: Maybe<Scalars['String']>;
};

/** Checks allow you to monitor how your services are built and operated. */
export type Check = {
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Specifies the input fields used to create an alert source usage check. */
export type CheckAlertSourceUsageCreateInput = {
  /** The condition that the alert source name should satisfy to be evaluated. */
  alertSourceNamePredicate?: InputMaybe<PredicateInput>;
  /** The type of the alert source. */
  alertSourceType?: InputMaybe<AlertSourceTypeEnum>;
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update an alert source usage check. */
export type CheckAlertSourceUsageUpdateInput = {
  /** The condition that the alert source name should satisfy to be evaluated. */
  alertSourceNamePredicate?: InputMaybe<PredicateUpdateInput>;
  /** The type of the alert source. */
  alertSourceType?: InputMaybe<AlertSourceTypeEnum>;
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** The connection type for Check. */
export type CheckConnection = {
  __typename?: 'CheckConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CheckEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Check>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used to create a check. */
export type CheckCreateInput = {
  /** Additional arguments required by some check types. */
  args?: InputMaybe<Scalars['JSON']>;
  /** The id of the campaign the check belongs to. */
  campaignId?: InputMaybe<Scalars['ID']>;
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The integration id this check will use. */
  integrationId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The type of check. */
  type: CheckType;
};

/** The return type of a `checkCreate` mutation. */
export type CheckCreatePayload = {
  __typename?: 'CheckCreatePayload';
  /** The newly created check. */
  check?: Maybe<Check>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** translation missing: en.graphql.types.check_create_template.self */
export type CheckCreateTemplate = {
  __typename?: 'CheckCreateTemplate';
  /** The name of the template to apply to the Check. */
  defaultName?: Maybe<Scalars['String']>;
  /** True if this check should pass by default. Otherwise the default 'pending' state counts as a failure. */
  passPending: Scalars['Boolean'];
  /** The formatted result message to show for the Check. */
  resultMessage?: Maybe<Scalars['String']>;
  /** The sample payload to use for the Check. */
  samplePayload?: Maybe<Scalars['String']>;
  /** The sample query params to use for the Check. */
  sampleQueryParams?: Maybe<Scalars['String']>;
  /** The JQ expression to use as the service specifier. */
  serviceSpecifier?: Maybe<Scalars['String']>;
  /** The JQ expression to use as the predicate for passing the Check. */
  successCondition?: Maybe<Scalars['String']>;
};

/** Specifies the input fields used to create a custom check. */
export type CheckCustomCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Creates a custom event check. */
export type CheckCustomEventCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The integration id this check will use. */
  integrationId: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** True if this check should pass by default. Otherwise the default 'pending' state counts as a failure. */
  passPending?: InputMaybe<Scalars['Boolean']>;
  /**
   * The check result message template. It is compiled with Liquid and formatted in
   * Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating).
   */
  resultMessage?: InputMaybe<Scalars['String']>;
  /**
   * A jq expression that will be ran against your payload. This will parse out the
   * service identifier. [More info about jq](https://jqplay.org/).
   */
  serviceSelector: Scalars['String'];
  /**
   * A jq expression that will be ran against your payload. A truthy value will
   * result in the check passing. [More info about jq](https://jqplay.org/).
   */
  successCondition: Scalars['String'];
};

/** Specifies the input fields used to update a custom event check. */
export type CheckCustomEventUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The integration id this check will use. */
  integrationId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** True if this check should pass by default. Otherwise the default 'pending' state counts as a failure. */
  passPending?: InputMaybe<Scalars['Boolean']>;
  /**
   * The check result message template. It is compiled with Liquid and formatted in
   * Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating).
   */
  resultMessage?: InputMaybe<Scalars['String']>;
  /**
   * A jq expression that will be ran against your payload. This will parse out the
   * service identifier. [More info about jq](https://jqplay.org/).
   */
  serviceSelector?: InputMaybe<Scalars['String']>;
  /**
   * A jq expression that will be ran against your payload. A truthy value will
   * result in the check passing. [More info about jq](https://jqplay.org/).
   */
  successCondition?: InputMaybe<Scalars['String']>;
};

/** Specifies the input fields used to update a custom check. */
export type CheckCustomUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to delete a check. */
export type CheckDeleteInput = {
  /** The id of the check to be deleted. */
  id?: InputMaybe<Scalars['ID']>;
};

/** The return type of a `checkDelete` mutation. */
export type CheckDeletePayload = {
  __typename?: 'CheckDeletePayload';
  /** The id of the deleted check. */
  deletedCheckId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type CheckEdge = {
  __typename?: 'CheckEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Check>;
};

/** Specifies the input fields used to create a branch protection check. */
export type CheckGitBranchProtectionCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a branch protection check. */
export type CheckGitBranchProtectionUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create a documentation check. */
export type CheckHasDocumentationCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The subtype of the document. */
  documentSubtype: HasDocumentationSubtypeEnum;
  /** The type of the document. */
  documentType: HasDocumentationTypeEnum;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a documentation check. */
export type CheckHasDocumentationUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The subtype of the document. */
  documentSubtype?: InputMaybe<HasDocumentationSubtypeEnum>;
  /** The type of the document. */
  documentType?: InputMaybe<HasDocumentationTypeEnum>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create a recent deploys check. */
export type CheckHasRecentDeployCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The number of days to check since the last deploy. */
  days: Scalars['Int'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a has recent deploy check. */
export type CheckHasRecentDeployUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The number of days to check since the last deploy. */
  days?: InputMaybe<Scalars['Int']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

export type CheckIntegration = Integration & {
  __typename?: 'CheckIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** The relation between a level and a check. */
export type CheckLevel = {
  __typename?: 'CheckLevel';
  /** The level of the check. */
  level: Level;
};

/** Specifies the input fields used to create a manual check. */
export type CheckManualCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** Defines the minimum frequency of the updates. */
  updateFrequency?: InputMaybe<ManualCheckFrequencyInput>;
  /** Whether the check requires a comment or not. */
  updateRequiresComment: Scalars['Boolean'];
};

/** Specifies the input fields used to update a manual check. */
export type CheckManualUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** Defines the minimum frequency of the updates. */
  updateFrequency?: InputMaybe<ManualCheckFrequencyUpdateInput>;
  /** Whether the check requires a comment or not. */
  updateRequiresComment?: InputMaybe<Scalars['Boolean']>;
};

/** The owner a check can belong to. */
export type CheckOwner = Team | User;

/** Creates a payload check. */
export type CheckPayloadCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /**
   * A jq expression that will be ran against your payload. A truthy value will
   * result in the check passing. [More info about jq](https://jqplay.org/).
   */
  jqExpression: Scalars['String'];
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /**
   * The check result message template. It is compiled with Liquid and formatted in
   * Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating).
   */
  resultMessage?: InputMaybe<Scalars['String']>;
};

/** Specifies the input fields used to update a payload check. */
export type CheckPayloadUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /**
   * A jq expression that will be ran against your payload. A truthy value will
   * result in the check passing. [More info about jq](https://jqplay.org/).
   */
  jqExpression?: InputMaybe<Scalars['String']>;
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /**
   * The check result message template. It is compiled with Liquid and formatted in
   * Markdown. [More info about liquid templates](https://www.opslevel.com/docs/checks/payload-checks/#liquid-templating).
   */
  resultMessage?: InputMaybe<Scalars['String']>;
};

/** Specifies the input fields used to create a repo file check. */
export type CheckRepositoryFileCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** Whether the check looks for the existence of a directory instead of a file. */
  directorySearch?: InputMaybe<Scalars['Boolean']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** Condition to match the file content. */
  fileContentsPredicate?: InputMaybe<PredicateInput>;
  /** Restrict the search to certain file paths. */
  filePaths: Array<Scalars['String']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /**
   * Whether the checks looks at the absolute root of a repo or the relative root
   * (the directory specified when attached a repo to a service).
   */
  useAbsoluteRoot?: InputMaybe<Scalars['Boolean']>;
};

/** Specifies the input fields used to update a repo file check. */
export type CheckRepositoryFileUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** Whether the check looks for the existence of a directory instead of a file. */
  directorySearch?: InputMaybe<Scalars['Boolean']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** Condition to match the file content. */
  fileContentsPredicate?: InputMaybe<PredicateUpdateInput>;
  /** Restrict the search to certain file paths. */
  filePaths?: InputMaybe<Array<Scalars['String']>>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /**
   * Whether the checks looks at the absolute root of a repo or the relative root
   * (the directory specified when attached a repo to a service).
   */
  useAbsoluteRoot?: InputMaybe<Scalars['Boolean']>;
};

/** Specifies the input fields used to create a repo grep check. */
export type CheckRepositoryGrepCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** Whether the check looks for the existence of a directory instead of a file. */
  directorySearch?: InputMaybe<Scalars['Boolean']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** Condition to match the file content. */
  fileContentsPredicate: PredicateInput;
  /** Restrict the search to certain file paths. */
  filePaths: Array<Scalars['String']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a repo file check. */
export type CheckRepositoryGrepUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** Whether the check looks for the existence of a directory instead of a file. */
  directorySearch?: InputMaybe<Scalars['Boolean']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** Condition to match the file content. */
  fileContentsPredicate?: InputMaybe<PredicateUpdateInput>;
  /** Restrict the search to certain file paths. */
  filePaths?: InputMaybe<Array<Scalars['String']>>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create a repository integrated check. */
export type CheckRepositoryIntegratedCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a repository integrated check. */
export type CheckRepositoryIntegratedUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create a repo search check. */
export type CheckRepositorySearchCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** Condition to match the text content. */
  fileContentsPredicate: PredicateInput;
  /**
   * Restrict the search to files of given extensions. Extensions should contain
   * only letters and numbers. For example: `['py', 'rb']`.
   */
  fileExtensions?: InputMaybe<Array<Scalars['String']>>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** The search to perform */
export type CheckRepositorySearchInput = {
  /** Condition to match the text content. */
  fileContentsPredicate: PredicateInput;
  /**
   * Restrict the search to files of given extensions. Extensions should contain
   * only letters and numbers. For example: `['py', 'rb']`.
   */
  fileExtensions?: InputMaybe<Array<Scalars['String']>>;
};

/** Specifies the input fields used to update a repo search check. */
export type CheckRepositorySearchUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** Condition to match the text content. */
  fileContentsPredicate?: InputMaybe<PredicateUpdateInput>;
  /**
   * Restrict the search to files of given extensions. Extensions should contain
   * only letters and numbers. For example: `['py', 'rb']`.
   */
  fileExtensions?: InputMaybe<Array<Scalars['String']>>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** The result for a given Check */
export type CheckResult = {
  __typename?: 'CheckResult';
  /** The check of check result. */
  check: Check;
  /** The time the action was recorded. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The escaped safe message for rendering on html. */
  htmlMessage?: Maybe<Scalars['String']>;
  /** If the check result for a manual check is not an actual update but an initial failure. */
  isInitialManualCheckResult: Scalars['Boolean'];
  /** The check message. */
  message: Scalars['String'];
  /** The service of check result. */
  service?: Maybe<Service>;
  /** The alias for the service. */
  serviceAlias?: Maybe<Scalars['String']>;
  /** The check status. */
  status: CheckStatus;
  /** The warnings for templated messages evaluation. */
  warnMessage?: Maybe<Scalars['String']>;
};

/** The check results grouped by campaign. */
export type CheckResultsByCampaign = {
  __typename?: 'CheckResultsByCampaign';
  /** The campaign these check results are linked to. */
  campaign?: Maybe<Campaign>;
  /** A list of check results of this service for checks in the campaign. */
  items?: Maybe<CampaignCheckResultsConnection>;
  /** Status of whether this service is passing all checks for the campaign or not. */
  status?: Maybe<CampaignServiceStatusEnum>;
};


/** The check results grouped by campaign. */
export type CheckResultsByCampaignItemsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for CheckResultsByCampaign. */
export type CheckResultsByCampaignConnection = {
  __typename?: 'CheckResultsByCampaignConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CheckResultsByCampaignEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CheckResultsByCampaign>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type CheckResultsByCampaignEdge = {
  __typename?: 'CheckResultsByCampaignEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CheckResultsByCampaign>;
};

/** The check results grouped by level. */
export type CheckResultsByLevel = {
  __typename?: 'CheckResultsByLevel';
  /** A list of check results by level. */
  items?: Maybe<CheckResultsConnection>;
  /** The check result level. */
  level?: Maybe<Level>;
};


/** The check results grouped by level. */
export type CheckResultsByLevelItemsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for CheckResultsByLevel. */
export type CheckResultsByLevelConnection = {
  __typename?: 'CheckResultsByLevelConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CheckResultsByLevelEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CheckResultsByLevel>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type CheckResultsByLevelEdge = {
  __typename?: 'CheckResultsByLevelEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CheckResultsByLevel>;
};

/** The connection type for CheckResult. */
export type CheckResultsConnection = {
  __typename?: 'CheckResultsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CheckResultsEdge>>>;
  /** The total number of failed checks on the service. */
  enabledFailingCount?: Maybe<Scalars['Int']>;
  /** The total number of not evaluated on the service. */
  enabledPendingCount?: Maybe<Scalars['Int']>;
  /** The total number of checks on the service. */
  enabledTotalCount?: Maybe<Scalars['Int']>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CheckResult>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
  /** The total number of upcoming checks failing on the service. */
  upcomingFailingCount?: Maybe<Scalars['Int']>;
  /** The total number of upcoming checks pending on the service. */
  upcomingPendingCount?: Maybe<Scalars['Int']>;
  /** The total number of upcoming checks on the service. */
  upcomingTotalCount?: Maybe<Scalars['Int']>;
};

/** An edge in a connection. */
export type CheckResultsEdge = {
  __typename?: 'CheckResultsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CheckResult>;
};

/** Specifies the input fields used to create a configuration check. */
export type CheckServiceConfigurationCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a configuration check. */
export type CheckServiceConfigurationUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create a service dependency check. */
export type CheckServiceDependencyCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to update a service dependency check. */
export type CheckServiceDependencyUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create an ownership check. */
export type CheckServiceOwnershipCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The type of contact method that an owner should provide */
  contactMethod?: InputMaybe<Scalars['String']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** Whether to require a contact method for a service owner or not */
  requireContactMethod?: InputMaybe<Scalars['Boolean']>;
  /** The tag key that should exist for a service owner. */
  tagKey?: InputMaybe<Scalars['String']>;
  /** The condition that should be satisfied by the tag value. */
  tagPredicate?: InputMaybe<PredicateInput>;
};

/** Specifies the input fields used to update an ownership check. */
export type CheckServiceOwnershipUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The type of contact method that an owner should provide */
  contactMethod?: InputMaybe<Scalars['String']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** Whether to require a contact method for a service owner or not */
  requireContactMethod?: InputMaybe<Scalars['Boolean']>;
  /** The tag key that should exist for a service owner. */
  tagKey?: InputMaybe<Scalars['String']>;
  /** The condition that should be satisfied by the tag value. */
  tagPredicate?: InputMaybe<PredicateUpdateInput>;
};

/** Specifies the input fields used to create a service property check. */
export type CheckServicePropertyCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The condition that should be satisfied by the service property value. */
  propertyValuePredicate?: InputMaybe<PredicateInput>;
  /** The property of the service that the check will verify. */
  serviceProperty: ServicePropertyTypeEnum;
};

/** Specifies the input fields used to update a service property check. */
export type CheckServicePropertyUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The condition that should be satisfied by the service property value. */
  propertyValuePredicate?: InputMaybe<PredicateUpdateInput>;
  /** The property of the service that the check will verify. */
  serviceProperty?: InputMaybe<ServicePropertyTypeEnum>;
};

/** Check stats shows a summary of check results. */
export type CheckStats = {
  __typename?: 'CheckStats';
  /** The number of existing checks for the resource. */
  totalChecks: Scalars['Int'];
  /** The number of checks that are passing for the resource. */
  totalPassingChecks: Scalars['Int'];
};

/** The evaluation status of the check. */
export enum CheckStatus {
  /** The check evaluated to a falsy value based on some conditions. */
  Failed = 'failed',
  /** The check evaluated to a truthy value based on some conditions. */
  Passed = 'passed',
  /** The check has not been evaluated yet.. */
  Pending = 'pending'
}

/** Specifies the input fields used to create a tag check. */
export type CheckTagDefinedCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The tag key where the tag predicate should be applied. */
  tagKey: Scalars['String'];
  /** The condition that should be satisfied by the tag value. */
  tagPredicate?: InputMaybe<PredicateInput>;
};

/** Specifies the input fields used to update a tag defined check. */
export type CheckTagDefinedUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The tag key where the tag predicate should be applied. */
  tagKey?: InputMaybe<Scalars['String']>;
  /** The condition that should be satisfied by the tag value. */
  tagPredicate?: InputMaybe<PredicateUpdateInput>;
};

/** translation missing: en.graphql.types.check_template_payload.self */
export type CheckTemplatePayload = {
  __typename?: 'CheckTemplatePayload';
  /** translation missing: en.graphql.types.check_template_payload.check_status */
  checkStatus?: Maybe<CheckStatus>;
  /** translation missing: en.graphql.types.check_template_payload.errors */
  errors?: Maybe<Array<Error>>;
  /** translation missing: en.graphql.types.check_template_payload.found_services */
  foundServices?: Maybe<Array<Scalars['String']>>;
  /** translation missing: en.graphql.types.check_template_payload.message */
  message?: Maybe<Scalars['String']>;
  /** translation missing: en.graphql.types.check_template_payload.sample_webhook */
  sampleWebhook?: Maybe<Scalars['String']>;
};

/** Specifies the input fields used to promote a campaign check to the rubric. */
export type CheckToPromoteInput = {
  /** The ID of the category that the promoted check will be linked to. */
  categoryId: Scalars['ID'];
  /** The ID of the check to be promoted to the rubric. */
  checkId: Scalars['ID'];
  /** The ID of the level that the promoted check will be linked to. */
  levelId: Scalars['ID'];
};

/** Specifies the input fields used to create a tool usage check. */
export type CheckToolUsageCreateInput = {
  /** The id of the category the check belongs to. */
  categoryId: Scalars['ID'];
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The condition that the environment should satisfy to be evaluated. */
  environmentPredicate?: InputMaybe<PredicateInput>;
  /** The id of the filter of the check. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the level the check belongs to. */
  levelId: Scalars['ID'];
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the team that owns the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The category that the tool belongs to. */
  toolCategory: ToolCategory;
  /** The condition that the tool name should satisfy to be evaluated. */
  toolNamePredicate?: InputMaybe<PredicateInput>;
  /** The condition that the tool url should satisfy to be evaluated. */
  toolUrlPredicate?: InputMaybe<PredicateInput>;
};

/** Specifies the input fields used to update a tool usage check. */
export type CheckToolUsageUpdateInput = {
  /** The id of the category the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** Whether the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The condition that the environment should satisfy to be evaluated. */
  environmentPredicate?: InputMaybe<PredicateUpdateInput>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The id of the level the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The category that the tool belongs to. */
  toolCategory?: InputMaybe<ToolCategory>;
  /** The condition that the tool name should satisfy to be evaluated. */
  toolNamePredicate?: InputMaybe<PredicateUpdateInput>;
  /** The condition that the tool url should satisfy to be evaluated. */
  toolUrlPredicate?: InputMaybe<PredicateUpdateInput>;
};

/** The type of check. */
export enum CheckType {
  /** Verifies that the service has an alert source of a particular type or name. */
  AlertSourceUsage = 'alert_source_usage',
  /** Allows for the creation of programmatic checks that use an API to mark the status as passing or failing. */
  Custom = 'custom',
  /** Requires a generic integration api call to complete a series of checks for multiple services. */
  Generic = 'generic',
  /** Verifies that all the repositories on the service have branch protection enabled. */
  GitBranchProtection = 'git_branch_protection',
  /** Verifies that the service has visible documentation of a particular type and subtype. */
  HasDocumentation = 'has_documentation',
  /** Verifies that the service has an owner defined. */
  HasOwner = 'has_owner',
  /** Verified that the services has received a deploy within a specified number of days. */
  HasRecentDeploy = 'has_recent_deploy',
  /** Verifies that the service has a repository integrated. */
  HasRepository = 'has_repository',
  /** Verifies that the service is maintained though the use of an opslevel.yml service config. */
  HasServiceConfig = 'has_service_config',
  /** Requires a service owner to manually complete a check for the service. */
  Manual = 'manual',
  /** Requires a payload integration api call to complete a check for the service. */
  Payload = 'payload',
  /** Quickly scan the service’s repository for the existence or contents of a specific file. */
  RepoFile = 'repo_file',
  /** Run a comprehensive search across the service's repository using advanced search parameters. */
  RepoGrep = 'repo_grep',
  /** Quickly search the service’s repository for specific contents in any file. */
  RepoSearch = 'repo_search',
  /** Verifies that the service has either a dependent or dependency. */
  ServiceDependency = 'service_dependency',
  /** Verifies that a service property is set or matches a specified format. */
  ServiceProperty = 'service_property',
  /** Verifies that the service has the specified tag defined. */
  TagDefined = 'tag_defined',
  /** Verifies that the service is using a tool of a particular category or name. */
  ToolUsage = 'tool_usage'
}

/** Specifies the input fields used to update a check. */
export type CheckUpdateInput = {
  /** Additional arguments required by some check types. */
  args?: InputMaybe<Scalars['JSON']>;
  /** The campaign id that the check belongs to. */
  campaignId?: InputMaybe<Scalars['ID']>;
  /** The category id that the check belongs to. */
  categoryId?: InputMaybe<Scalars['ID']>;
  /** translation missing: en.graphql.types.check_update_input.enable_on */
  enableOn?: InputMaybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled?: InputMaybe<Scalars['Boolean']>;
  /** The id of the filter the check belongs to. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The id of the check to be updated. */
  id: Scalars['ID'];
  /** The integration id this check will use. */
  integrationId?: InputMaybe<Scalars['ID']>;
  /** The level id that the check belongs to. */
  levelId?: InputMaybe<Scalars['ID']>;
  /** The display name of the check. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: InputMaybe<Scalars['String']>;
  /** The id of the owner of the check. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** The return type of a `checkUpdate` mutation. */
export type CheckUpdatePayload = {
  __typename?: 'CheckUpdatePayload';
  /** Checks allow you to monitor how your services are built and operated. */
  check?: Maybe<Check>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used to parse a check. */
export type CheckYamlParseInput = {
  /** The raw yaml contents for importing a check. */
  checkYaml: Scalars['String'];
};

/** Return type for the check yaml parse */
export type CheckYamlParsePayload = {
  __typename?: 'CheckYamlParsePayload';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The display name of the check. */
  name?: Maybe<Scalars['String']>;
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The type of check. */
  type?: Maybe<Scalars['String']>;
};

/** Specifies the input fields used to copy selected rubric checks to an existing campaign. */
export type ChecksCopyToCampaignInput = {
  /** The ID of the existing campaign. */
  campaignId: Scalars['ID'];
  /** The IDs of the existing rubric checks to be copied. */
  checkIds: Array<Scalars['ID']>;
};

/** The return type of a `checksCopyToCampaign` mutation. */
export type ChecksCopyToCampaignPayload = {
  __typename?: 'ChecksCopyToCampaignPayload';
  /** A campaign is a fixed time initiative that allows you to attach checks to and progress through towards completion. */
  campaign?: Maybe<Campaign>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An error that occurred when syncing an opslevel.yml file. */
export type ConfigError = {
  __typename?: 'ConfigError';
  /** The key that caused the error (if applicable). */
  key?: Maybe<Scalars['String']>;
  /** A description of the error. */
  message?: Maybe<Scalars['String']>;
  /** The file type where the error was found. */
  origin: Scalars['String'];
  /** The type of error that occurred. */
  type: ConfigErrorClass;
};

/** The possible types of a config error. */
export enum ConfigErrorClass {
  /** An alert source error. */
  AlertSourceError = 'ALERT_SOURCE_ERROR',
  /** An alias error. */
  AliasError = 'ALIAS_ERROR',
  /** An invalid value error. */
  InvalidValueError = 'INVALID_VALUE_ERROR',
  /** A missing key error. */
  MissingKeyError = 'MISSING_KEY_ERROR',
  /** A service dependency error. */
  ServiceDependencyError = 'SERVICE_DEPENDENCY_ERROR',
  /** A service repository error. */
  ServiceRepositoryError = 'SERVICE_REPOSITORY_ERROR',
  /** A syntax error. */
  SyntaxError = 'SYNTAX_ERROR',
  /** A tag error. */
  TagError = 'TAG_ERROR',
  /** A tool error. */
  ToolError = 'TOOL_ERROR'
}

/** translation missing: en.graphql.types.config_file.self */
export type ConfigFile = {
  __typename?: 'ConfigFile';
  /** The relation for which the config was returned. */
  ownerType: Scalars['String'];
  /** The OpsLevel config in yaml format. */
  yaml: Scalars['String'];
};

/** The logical operator to be used in conjunction with multiple filters (requires filters to be supplied). */
export enum ConnectiveEnum {
  /** Used to ensure **all** filters match for a given resource. */
  And = 'and',
  /** Used to ensure **any** filters match for a given resource. */
  Or = 'or'
}

/** A method of contact for a team. */
export type Contact = {
  __typename?: 'Contact';
  /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
  address: Scalars['String'];
  /** The name shown in the UI for the contact. */
  displayName?: Maybe<Scalars['String']>;
  /** The type shown in the UI for the contact. */
  displayType?: Maybe<Scalars['String']>;
  /** The unique identifier for the contact. */
  id: Scalars['ID'];
  /** The team or user the contact belongs to. */
  owner: ContactOwner;
  /** Indicates if this address is in use on another user for this account. */
  sharedAddress: Scalars['Boolean'];
  /**
   * The contact href. Examples: mail_to:support@company.com for type `email`,
   * https://org.slack.com/channels/team for type `slack`.
   */
  targetHref?: Maybe<Scalars['String']>;
  /**
   * The team the contact belongs to.
   * @deprecated Use Owner field
   */
  team?: Maybe<Team>;
  /** The method of contact [email, slack, slack_handle, web]. */
  type: ContactType;
};

/** Specifies the input fields used to create a contact. */
export type ContactCreateInput = {
  /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
  address: Scalars['String'];
  /** The name shown in the UI for the contact. */
  displayName?: InputMaybe<Scalars['String']>;
  /** The type shown in the UI for the contact. */
  displayType?: InputMaybe<Scalars['String']>;
  /** The id of the owner of this contact. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The alias of the team the contact belongs to. */
  teamAlias?: InputMaybe<Scalars['String']>;
  /** The method of contact [email, slack, slack_handle, web]. */
  type: ContactType;
};

/** The return type of a `contactCreate` mutation. */
export type ContactCreatePayload = {
  __typename?: 'ContactCreatePayload';
  /** A method of contact for a team. */
  contact?: Maybe<Contact>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used to delete a contact. */
export type ContactDeleteInput = {
  /** The `id` of the contact you wish to delete. */
  id: Scalars['ID'];
};

/** The return type of a `contactDelete` mutation. */
export type ContactDeletePayload = {
  __typename?: 'ContactDeletePayload';
  /** The `id` of the deleted contact. */
  deletedContactId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used to create a contact. */
export type ContactInput = {
  /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
  address: Scalars['String'];
  /** The name shown in the UI for the contact. */
  displayName?: InputMaybe<Scalars['String']>;
  /** The method of contact [email, slack, slack_handle, web]. */
  type: ContactType;
};

/** The owner of this contact. */
export type ContactOwner = Team | User;

/** The method of contact. */
export enum ContactType {
  /** An email contact method. */
  Email = 'email',
  /** A GitHub handle. */
  Github = 'github',
  /** A Slack channel contact method. */
  Slack = 'slack',
  /** A Slack handle contact method. */
  SlackHandle = 'slack_handle',
  /** A website contact method. */
  Web = 'web'
}

/** Specifies the input fields used to update a contact. */
export type ContactUpdateInput = {
  /** The contact address. Examples: support@company.com for type `email`, https://opslevel.com for type `web`. */
  address?: InputMaybe<Scalars['String']>;
  /** The name shown in the UI for the contact. */
  displayName?: InputMaybe<Scalars['String']>;
  /** The type shown in the UI for the contact. */
  displayType?: InputMaybe<Scalars['String']>;
  /** The unique identifier for the contact. */
  id: Scalars['ID'];
  /** The method of contact [email, slack, slack_handle, web]. */
  type?: InputMaybe<ContactType>;
};

/** The return type of a `contactUpdate` mutation. */
export type ContactUpdatePayload = {
  __typename?: 'ContactUpdatePayload';
  /** A method of contact for a team. */
  contact?: Maybe<Contact>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** The object that an event was triggered on. */
export type CustomActionsAssociatedObject = Service;

/** The entity types a custom action can be associated with. */
export enum CustomActionsEntityTypeEnum {
  /** A custom action associated with the global scope (no particular entity type). */
  Global = 'GLOBAL',
  /** A custom action associated with services. */
  Service = 'SERVICE'
}

/** An external action to be triggered by a custom action. */
export type CustomActionsExternalAction = {
  /** Any aliases for this external action. */
  aliases: Array<Scalars['String']>;
  /** A description of what the action should accomplish. */
  description?: Maybe<Scalars['String']>;
  /** The ID of the external action. */
  id: Scalars['ID'];
  /** The liquid template used to generate the data sent to the external action. */
  liquidTemplate?: Maybe<Scalars['String']>;
  /** The name of the external action. */
  name: Scalars['String'];
};

/** The connection type for CustomActionsExternalAction. */
export type CustomActionsExternalActionsConnection = {
  __typename?: 'CustomActionsExternalActionsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CustomActionsExternalActionsEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CustomActionsExternalAction>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type CustomActionsExternalActionsEdge = {
  __typename?: 'CustomActionsExternalActionsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CustomActionsExternalAction>;
};

/** An HTTP request method. */
export enum CustomActionsHttpMethodEnum {
  /** An HTTP DELETE request. */
  Delete = 'DELETE',
  /** An HTTP GET request. */
  Get = 'GET',
  /** An HTTP PATCH request. */
  Patch = 'PATCH',
  /** An HTTP POST request. */
  Post = 'POST',
  /** An HTTP PUT request. */
  Put = 'PUT'
}

/** Template of a custom action. */
export type CustomActionsTemplate = {
  __typename?: 'CustomActionsTemplate';
  /** The template's action. */
  action: CustomActionsTemplatesAction;
  /** The template's metadata. */
  metadata: CustomActionsTemplatesMetadata;
  /** The template's trigger definition. */
  triggerDefinition: CustomActionsTemplatesTriggerDefinition;
};

/** The action of a custom action template. */
export type CustomActionsTemplatesAction = {
  __typename?: 'CustomActionsTemplatesAction';
  /** A description of what the action should accomplish. */
  description?: Maybe<Scalars['String']>;
  /** The headers sent along with the webhook, if any. */
  headers?: Maybe<Scalars['JSON']>;
  /** The HTTP Method used to call the webhook action. */
  httpMethod: CustomActionsHttpMethodEnum;
  /** The liquid template used to generate the data sent to the external action. */
  liquidTemplate?: Maybe<Scalars['String']>;
  /** The name of the external action. */
  name: Scalars['String'];
  /** The URL of the webhook action. */
  url: Scalars['String'];
};

/** The metadata about the custom action template. */
export type CustomActionsTemplatesMetadata = {
  __typename?: 'CustomActionsTemplatesMetadata';
  /** The categories for the custom action template. */
  categories: Array<Scalars['String']>;
  /** The description of the custom action template. */
  description?: Maybe<Scalars['String']>;
  /** The icon for the custom action template. */
  icon?: Maybe<Scalars['String']>;
  /** The name of the custom action template. */
  name: Scalars['String'];
};

/** The definition of a potential trigger for a template custom action. */
export type CustomActionsTemplatesTriggerDefinition = CustomActionsTriggerDefinitionBase & {
  __typename?: 'CustomActionsTemplatesTriggerDefinition';
  /** The set of users that should be able to use the trigger definition. */
  accessControl: CustomActionsTriggerDefinitionAccessControlEnum;
  /** The description of what the trigger definition will do. */
  description?: Maybe<Scalars['String']>;
  /** The YAML definition of any custom inputs for this trigger definition. */
  manualInputsDefinition?: Maybe<Scalars['String']>;
  /** The name of the trigger definition. */
  name: Scalars['String'];
  /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
  published: Scalars['Boolean'];
  /** The liquid template used to parse the response from the External Action. */
  responseTemplate?: Maybe<Scalars['String']>;
};

/** The definition of a potential trigger for a custom action. */
export type CustomActionsTriggerDefinition = CustomActionsTriggerDefinitionBase & {
  __typename?: 'CustomActionsTriggerDefinition';
  /** The set of users that should be able to use the trigger definition. */
  accessControl: CustomActionsTriggerDefinitionAccessControlEnum;
  /** The action that would be triggered. */
  action: CustomActionsExternalAction;
  /** Any aliases for this trigger definition. */
  aliases: Array<Scalars['String']>;
  /** If the user is authorized to invoke the action on the given associated object. */
  authorized?: Maybe<Scalars['Boolean']>;
  /** The description of what the trigger definition will do. */
  description?: Maybe<Scalars['String']>;
  /** The entity type associated with this trigger definition. */
  entityType: CustomActionsEntityTypeEnum;
  /** The set of additional teams who can invoke this trigger definition. */
  extendedTeamAccess: TeamConnection;
  /** A filter defining which services this trigger definition applies to, if present. */
  filter?: Maybe<Filter>;
  /** The ID of the trigger definition. */
  id: Scalars['ID'];
  /** The YAML definition of any custom inputs for this trigger definition. */
  manualInputsDefinition?: Maybe<Scalars['String']>;
  /** The name of the trigger definition. */
  name: Scalars['String'];
  /** The owner of the trigger definition. */
  owner?: Maybe<Team>;
  /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
  published: Scalars['Boolean'];
  /** The liquid template used to parse the response from the External Action. */
  responseTemplate?: Maybe<Scalars['String']>;
  /** Relevant timestamps. */
  timestamps: Timestamps;
};


/** The definition of a potential trigger for a custom action. */
export type CustomActionsTriggerDefinitionAuthorizedArgs = {
  associatedObject?: InputMaybe<IdentifierInput>;
};


/** The definition of a potential trigger for a custom action. */
export type CustomActionsTriggerDefinitionExtendedTeamAccessArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** Who can see and use the trigger definition */
export enum CustomActionsTriggerDefinitionAccessControlEnum {
  /** Admin users */
  Admins = 'admins',
  /** All users of OpsLevel */
  Everyone = 'everyone',
  /** The owners of a service */
  ServiceOwners = 'service_owners'
}

export type CustomActionsTriggerDefinitionBase = {
  /** The set of users that should be able to use the trigger definition. */
  accessControl: CustomActionsTriggerDefinitionAccessControlEnum;
  /** The description of what the trigger definition will do. */
  description?: Maybe<Scalars['String']>;
  /** The YAML definition of any custom inputs for this trigger definition. */
  manualInputsDefinition?: Maybe<Scalars['String']>;
  /** The name of the trigger definition. */
  name: Scalars['String'];
  /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
  published: Scalars['Boolean'];
  /** The liquid template used to parse the response from the External Action. */
  responseTemplate?: Maybe<Scalars['String']>;
};

/** The connection type for CustomActionsTriggerDefinition. */
export type CustomActionsTriggerDefinitionConnection = {
  __typename?: 'CustomActionsTriggerDefinitionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CustomActionsTriggerDefinitionEdge>>>;
  /** The number of trigger definitions that match the query */
  filteredCount: Scalars['Int'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CustomActionsTriggerDefinition>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of trigger definitions for the account */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used in the `customActionsTriggerDefinitionCreate` mutation. */
export type CustomActionsTriggerDefinitionCreateInput = {
  /** The set of users that should be able to use the trigger definition. */
  accessControl?: InputMaybe<CustomActionsTriggerDefinitionAccessControlEnum>;
  /** The details for a new action to create for the Trigger Definition. */
  action?: InputMaybe<CustomActionsWebhookActionCreateInput>;
  /** The action that will be triggered by the Trigger Definition. */
  actionId?: InputMaybe<Scalars['ID']>;
  /** The description of what the Trigger Definition will do. */
  description?: InputMaybe<Scalars['String']>;
  /** The entity type to associate with the Trigger Definition. */
  entityType?: InputMaybe<CustomActionsEntityTypeEnum>;
  /** The set of additional teams who can invoke this Trigger Definition. */
  extendedTeamAccess?: InputMaybe<Array<IdentifierInput>>;
  /** The filter that will determine which services apply to the Trigger Definition. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The YAML definition of custom inputs for the Trigger Definition. */
  manualInputsDefinition?: InputMaybe<Scalars['String']>;
  /** The name of the Trigger Definition. */
  name: Scalars['String'];
  /** The owner of the Trigger Definition. */
  ownerId: Scalars['ID'];
  /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
  published?: InputMaybe<Scalars['Boolean']>;
  /** The liquid template used to parse the response from the External Action. */
  responseTemplate?: InputMaybe<Scalars['String']>;
};

/** Return type for the `customActionsTriggerDefinitionCreate` mutation. */
export type CustomActionsTriggerDefinitionCreatePayload = {
  __typename?: 'CustomActionsTriggerDefinitionCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The definition of a potential trigger for a custom action. */
  triggerDefinition?: Maybe<CustomActionsTriggerDefinition>;
};

/** An edge in a connection. */
export type CustomActionsTriggerDefinitionEdge = {
  __typename?: 'CustomActionsTriggerDefinitionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CustomActionsTriggerDefinition>;
};

/** Fields that can be used as part of filters for Trigger Definitions. */
export enum CustomActionsTriggerDefinitionFilterEnum {
  /** Filter by `access_control` field */
  AccessControl = 'access_control',
  /** Filter by `owner` field */
  OwnerId = 'owner_id',
  /** Filter by `published` field */
  Published = 'published'
}

/** Input to be used to filter types. */
export type CustomActionsTriggerDefinitionFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: CustomActionsTriggerDefinitionFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for Trigger Definitions. */
export enum CustomActionsTriggerDefinitionSortEnum {
  /** Order by `access_control` ascending */
  AccessControlAsc = 'access_control_ASC',
  /** Order by `access_control` descending */
  AccessControlDesc = 'access_control_DESC',
  /** Order by `created_at` ascending */
  CreatedAtAsc = 'created_at_ASC',
  /** Order by `created_at` descending */
  CreatedAtDesc = 'created_at_DESC',
  /** Order by `name` ascending */
  NameAsc = 'name_ASC',
  /** Order by `name` descending */
  NameDesc = 'name_DESC',
  /** Order by `owner` ascending */
  OwnerAsc = 'owner_ASC',
  /** Order by `owner` descending */
  OwnerDesc = 'owner_DESC',
  /** Order by `published` ascending */
  PublishedAsc = 'published_ASC',
  /** Order by `published` descending */
  PublishedDesc = 'published_DESC',
  /** Order by `updated_at` ascending */
  UpdatedAtAsc = 'updated_at_ASC',
  /** Order by `updated_at` descending */
  UpdatedAtDesc = 'updated_at_DESC'
}

/** Specifies the input fields used in the `customActionsTriggerDefinitionUpdate` mutation. */
export type CustomActionsTriggerDefinitionUpdateInput = {
  /** The set of users that should be able to use the trigger definition. */
  accessControl?: InputMaybe<CustomActionsTriggerDefinitionAccessControlEnum>;
  /** The details for the action to update for the Trigger Definition. */
  action?: InputMaybe<CustomActionsWebhookActionUpdateInput>;
  /** The action that will be triggered by the Trigger Definition. */
  actionId?: InputMaybe<Scalars['ID']>;
  /** The description of what the Trigger Definition will do. */
  description?: InputMaybe<Scalars['String']>;
  /** The entity type to associate with the Trigger Definition. */
  entityType?: InputMaybe<CustomActionsEntityTypeEnum>;
  /** The set of additional teams who can invoke this Trigger Definition. */
  extendedTeamAccess?: InputMaybe<Array<IdentifierInput>>;
  /** The filter that will determine which services apply to the Trigger Definition. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** The ID of the trigger definition. */
  id: Scalars['ID'];
  /** The YAML definition of custom inputs for the Trigger Definition. */
  manualInputsDefinition?: InputMaybe<Scalars['String']>;
  /** The name of the Trigger Definition. */
  name?: InputMaybe<Scalars['String']>;
  /** The owner of the Trigger Definition. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The published state of the action; true if the definition is ready for use; false if it is a draft. */
  published?: InputMaybe<Scalars['Boolean']>;
  /** The liquid template used to parse the response from the External Action. */
  responseTemplate?: InputMaybe<Scalars['String']>;
};

/** Return type for the `customActionsTriggerDefinitionUpdate` mutation. */
export type CustomActionsTriggerDefinitionUpdatePayload = {
  __typename?: 'CustomActionsTriggerDefinitionUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The definition of a potential trigger for a custom action. */
  triggerDefinition?: Maybe<CustomActionsTriggerDefinition>;
};

/** A single instance of an invocation of a trigger definition */
export type CustomActionsTriggerEvent = {
  __typename?: 'CustomActionsTriggerEvent';
  /** The object that the event was triggered on. */
  associatedObject?: Maybe<CustomActionsAssociatedObject>;
  /** The context values used to render the action's templates. */
  context: Scalars['JSON'];
  /** The definition of the trigger event. */
  definition?: Maybe<CustomActionsTriggerDefinition>;
  /** The ID of the trigger definition Event. */
  id: Scalars['ID'];
  /** The response to the user, as generated from the template on the Trigger Definition. */
  renderedResponse?: Maybe<Scalars['String']>;
  /** The request sent to the action. */
  request?: Maybe<Scalars['String']>;
  /** The response recevied from the action. */
  response?: Maybe<Scalars['String']>;
  /** The status of the trigger event. */
  status: CustomActionsTriggerEventStatusEnum;
  /** Relevant timestamps. */
  timestamps: Timestamps;
  /** The user that triggered the event. */
  user: User;
};

/** The connection type for CustomActionsTriggerEvent. */
export type CustomActionsTriggerEventConnection = {
  __typename?: 'CustomActionsTriggerEventConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<CustomActionsTriggerEventEdge>>>;
  /** The number of trigger events that match the query */
  filteredCount: Scalars['Int'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<CustomActionsTriggerEvent>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of trigger events for the account */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type CustomActionsTriggerEventEdge = {
  __typename?: 'CustomActionsTriggerEventEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<CustomActionsTriggerEvent>;
};

/** Fields that can be used as part of filter for Custom Action Trigger Events. */
export enum CustomActionsTriggerEventFilterEnum {
  /** Filter Custom Action Triggers by status */
  Status = 'status',
  /** Filter Custom Action Triggers by trigger_definition_id */
  TriggerDefinitionId = 'trigger_definition_id',
  /** Filter Custom Action Triggers by user_id */
  UserId = 'user_id'
}

/** Input to be used to filter types. */
export type CustomActionsTriggerEventFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: CustomActionsTriggerEventFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for Custom Action Trigger Events. */
export enum CustomActionsTriggerEventSortEnum {
  /** Order by `action_name` ascending. */
  ActionNameAsc = 'action_name_ASC',
  /** Order by `action_name` descending. */
  ActionNameDesc = 'action_name_DESC',
  /** Order by `created_at` ascending. */
  CreatedAtAsc = 'created_at_ASC',
  /** Order by `created_at` descending. */
  CreatedAtDesc = 'created_at_DESC',
  /** Order by `status` ascending. */
  StatusAsc = 'status_ASC',
  /** Order by `status` descending. */
  StatusDesc = 'status_DESC',
  /** Order by `user_name` ascending. */
  UserNameAsc = 'user_name_ASC',
  /** Order by `user_name` descending. */
  UserNameDesc = 'user_name_DESC'
}

/** The status of the custom action trigger event. */
export enum CustomActionsTriggerEventStatusEnum {
  /** The action failed to complete. */
  Failure = 'FAILURE',
  /** A result has not been determined. */
  Pending = 'PENDING',
  /** The action completed succesfully. */
  Success = 'SUCCESS'
}

/** Inputs that specify the trigger definition to invoke, the user that invoked it, and what object it is invoked on. */
export type CustomActionsTriggerInvokeInput = {
  /** The ID of the object to perform the custom action on. */
  associatedObjectId?: InputMaybe<Scalars['ID']>;
  /** Additional details provided for a specific invocation of this Custom Action. */
  manualInputs?: InputMaybe<Scalars['JSON']>;
  /** The trigger definition to invoke. */
  triggerDefinition: IdentifierInput;
};

/** The response returned after invoking a custom action trigger. */
export type CustomActionsTriggerInvokePayload = {
  __typename?: 'CustomActionsTriggerInvokePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A single instance of an invocation of a trigger definition */
  triggerEvent?: Maybe<CustomActionsTriggerEvent>;
};

/** The response after validating a template. */
export type CustomActionsValidateTemplatePayloadType = {
  __typename?: 'CustomActionsValidateTemplatePayloadType';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The template that has been validated. */
  template?: Maybe<Scalars['String']>;
};

/** An external webhook action to be triggered by a custom action. */
export type CustomActionsWebhookAction = CustomActionsExternalAction & {
  __typename?: 'CustomActionsWebhookAction';
  /** Any aliases for this external action. */
  aliases: Array<Scalars['String']>;
  /** A description of what the action should accomplish. */
  description?: Maybe<Scalars['String']>;
  /** The headers sent along with the webhook, if any. */
  headers?: Maybe<Scalars['JSON']>;
  /** The HTTP Method used to call the webhook action. */
  httpMethod: CustomActionsHttpMethodEnum;
  /** The ID of the external action. */
  id: Scalars['ID'];
  /** The liquid template used to generate the data sent to the external action. */
  liquidTemplate?: Maybe<Scalars['String']>;
  /** The name of the external action. */
  name: Scalars['String'];
  /** The URL of the webhook action. */
  webhookUrl: Scalars['String'];
};

/** Specifies the input fields used in the `customActionsWebhookActionCreate` mutation. */
export type CustomActionsWebhookActionCreateInput = {
  /** The description that gets assigned to the Webhook Action you're creating. */
  description?: InputMaybe<Scalars['String']>;
  /** HTTP headers be passed along with your Webhook when triggered. */
  headers?: InputMaybe<Scalars['JSON']>;
  /** HTTP used when the Webhook is triggered. Either POST or PUT. */
  httpMethod: CustomActionsHttpMethodEnum;
  /** Template that can be used to generate a Webhook payload. */
  liquidTemplate?: InputMaybe<Scalars['String']>;
  /** The name that gets assigned to the Webhook Action you're creating. */
  name: Scalars['String'];
  /** The URL that you wish to send the Webhook to when triggered. */
  webhookUrl: Scalars['String'];
};

/** Return type for the `customActionsWebhookActionCreate` mutation. */
export type CustomActionsWebhookActionCreatePayload = {
  __typename?: 'CustomActionsWebhookActionCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** An external webhook action to be triggered by a custom action. */
  webhookAction?: Maybe<CustomActionsWebhookAction>;
};

/** Inputs that specify the details of a Webhook Action you wish to update */
export type CustomActionsWebhookActionUpdateInput = {
  /** The description that gets assigned to the Webhook Action you're creating. */
  description?: InputMaybe<Scalars['String']>;
  /** HTTP headers be passed along with your Webhook when triggered. */
  headers?: InputMaybe<Scalars['JSON']>;
  /** HTTP used when the Webhook is triggered. Either POST or PUT. */
  httpMethod?: InputMaybe<CustomActionsHttpMethodEnum>;
  /** The ID of the Webhook Action you wish to update. */
  id: Scalars['ID'];
  /** Template that can be used to generate a Webhook payload. */
  liquidTemplate?: InputMaybe<Scalars['String']>;
  /** The name that gets assigned to the Webhook Action you're creating. */
  name?: InputMaybe<Scalars['String']>;
  /** The URL that you wish to send the Webhook too when triggered. */
  webhookUrl?: InputMaybe<Scalars['String']>;
};

/** The response returned after updating a Webhook Action */
export type CustomActionsWebhookActionUpdatePayload = {
  __typename?: 'CustomActionsWebhookActionUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** An external webhook action to be triggered by a custom action. */
  webhookAction?: Maybe<CustomActionsWebhookAction>;
};

export type CustomCheck = Check & {
  __typename?: 'CustomCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

export type CustomEventCheck = Check & {
  __typename?: 'CustomEventCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /** The integration this check uses. */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** True if this check should pass by default. Otherwise the default 'pending' state counts as a failure. */
  passPending: Scalars['Boolean'];
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** The check result message template. */
  resultMessage?: Maybe<Scalars['String']>;
  /** A jq expression that will be ran against your payload to select the service. */
  serviceSelector: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /**
   * A jq expression that will be ran against your payload to evaluate the check
   * result. A truthy value will result in the check passing.
   */
  successCondition: Scalars['String'];
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Specifies the input fields used in the `datadogCredentialsUpdate` mutation. */
export type DatadogCredentialsUpdateInput = {
  /** The API Key for the datadog integration. */
  apiKey: Scalars['String'];
  /** The App Key for the datadog integration. */
  appKey: Scalars['String'];
  /** The id of the datadog integration to update. */
  integrationId: Scalars['ID'];
};

/** Return type for the `datadogCredentialsUpdate` mutation. */
export type DatadogCredentialsUpdatePayload = {
  __typename?: 'DatadogCredentialsUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Returns whether the datadog credential update was successful. */
  success?: Maybe<Scalars['Boolean']>;
};

export type DatadogIntegration = Integration & {
  __typename?: 'DatadogIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** Specifies the input fields used to delete an entity. */
export type DeleteInput = {
  /** The id of the entity to be deleted. */
  id: Scalars['ID'];
};

/** The return type of the delete mutation. */
export type DeletePayload = {
  __typename?: 'DeletePayload';
  /** The id of the deleted entity. */
  deletedId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An event sent via webhook to track deploys. */
export type Deploy = {
  __typename?: 'Deploy';
  /** The associated OpsLevel user for the deploy. */
  associatedUser?: Maybe<User>;
  /** The author of the deploy. */
  author?: Maybe<Scalars['String']>;
  /** The email of the commit. */
  commitAuthorEmail?: Maybe<Scalars['String']>;
  /** The author of the commit. */
  commitAuthorName?: Maybe<Scalars['String']>;
  /** The time the commit was authored. */
  commitAuthoringDate?: Maybe<Scalars['ISO8601DateTime']>;
  /** The branch the commit took place on. */
  commitBranch?: Maybe<Scalars['String']>;
  /** The commit message associated with the deploy. */
  commitMessage?: Maybe<Scalars['String']>;
  /** The sha associated with the commit of the deploy. */
  commitSha?: Maybe<Scalars['String']>;
  /** The time the commit happened. */
  committedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The email of the person who created the commit. */
  committerEmail?: Maybe<Scalars['String']>;
  /** The name of the person who created the commit. */
  committerName?: Maybe<Scalars['String']>;
  /** An identifier to keep track of the version of the deploy. */
  deployNumber?: Maybe<Scalars['String']>;
  /** The url the where the deployment can be found. */
  deployUrl?: Maybe<Scalars['String']>;
  /** The time the deployment happened. */
  deployedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The email of who is responsible for the deployment. */
  deployerEmail?: Maybe<Scalars['String']>;
  /** An external id of who deployed. */
  deployerId?: Maybe<Scalars['String']>;
  /** The name of who is responsible for the deployment. */
  deployerName?: Maybe<Scalars['String']>;
  /** The given description of the deploy. */
  description: Scalars['String'];
  /** The environment in which the deployment happened in. */
  environment?: Maybe<Scalars['String']>;
  /** The id of the deploy. */
  id: Scalars['ID'];
  /** The integration name of the deploy. */
  providerName?: Maybe<Scalars['String']>;
  /** The integration type used the deploy. */
  providerType?: Maybe<Scalars['String']>;
  /** The url to the deploy integration. */
  providerUrl?: Maybe<Scalars['String']>;
  /** The service object the deploy is attached to. */
  service?: Maybe<Service>;
  /** The alias for the service. */
  serviceAlias: Scalars['String'];
  /** The id the deploy is associated to. */
  serviceId?: Maybe<Scalars['String']>;
  /** The deployment status. */
  status?: Maybe<Scalars['String']>;
};

/** The connection type for Deploy. */
export type DeployConnection = {
  __typename?: 'DeployConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<DeployEdge>>>;
  /** the total number of deploys that match the query criteria. */
  filteredCount: Scalars['Int'];
  /** Whether or not deploys exist for the given service. */
  hasDeploys: Scalars['Boolean'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Deploy>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of deploys for an account. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type DeployEdge = {
  __typename?: 'DeployEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Deploy>;
};

export type DeployIntegration = Integration & {
  __typename?: 'DeployIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A document that is attached to resource(s) in OpsLevel. */
export type Document = {
  __typename?: 'Document';
  /** The list of resources that are attached to this document */
  attachedResources?: Maybe<ResourceDocumentConnection>;
  /** The contents of the document. */
  content?: Maybe<Scalars['String']>;
  /** The file extension of the document, e.g. 'json'. */
  fileExtension?: Maybe<Scalars['String']>;
  /** The URL of the document, if any. */
  htmlUrl?: Maybe<Scalars['String']>;
  /** The ID of the Document. */
  id: Scalars['ID'];
  /** Metadata about the document. */
  metadata?: Maybe<Scalars['JSON']>;
  /** The path to the file in the repository (only available when the source is a Repository or ServiceRepository). */
  pathInRepository?: Maybe<Scalars['String']>;
  /** The source of the document. */
  source: DocumentSource;
  /** When the document was created and updated. */
  timestamps: Timestamps;
  /** The title of the document. */
  title: Scalars['String'];
  /** The type of the document. */
  type: DocumentTypeEnum;
};


/** A document that is attached to resource(s) in OpsLevel. */
export type DocumentAttachedResourcesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  hidden?: InputMaybe<Scalars['Boolean']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for Document. */
export type DocumentConnection = {
  __typename?: 'DocumentConnection';
  /** The number of Api type documents on the account. */
  apiDocCount?: Maybe<Scalars['Int']>;
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<DocumentEdge>>>;
  /** The number of documents on the account that match the provided search critera. */
  filteredCount?: Maybe<Scalars['Int']>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Document>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of Tech type documents on the account. */
  techDocCount?: Maybe<Scalars['Int']>;
  /** The total number of documents on the account. */
  totalCount?: Maybe<Scalars['Int']>;
};

/** An edge in a connection. */
export type DocumentEdge = {
  __typename?: 'DocumentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** A hash of the fields and their associated highlights from a document query. */
  highlights?: Maybe<Scalars['JSON']>;
  /** The item at the end of the edge. */
  node?: Maybe<Document>;
};

/** Sort possibilities for documents. */
export enum DocumentSortEnum {
  /** Order by `created_at` ascending */
  CreatedAtAsc = 'created_at_ASC',
  /** Order by `created_at` descending */
  CreatedAtDesc = 'created_at_DESC'
}

/** The source of a document. */
export type DocumentSource = ApiDocIntegration | Repository | ServiceRepository;

/** The type of the document. */
export enum DocumentTypeEnum {
  /** An API document */
  Api = 'api',
  /** A tech document */
  Tech = 'tech'
}

/** Return type for the `domainChildAssign` mutation. */
export type DomainChildAssignPayload = {
  __typename?: 'DomainChildAssignPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Return type for the `domainChildRemove` mutation. */
export type DomainChildRemovePayload = {
  __typename?: 'DomainChildRemovePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used in the `domainCreate` mutation. */
export type DomainCreateInput = {
  /** The description for the domain. */
  description?: InputMaybe<Scalars['String']>;
  /** The name for the domain. */
  name: Scalars['String'];
  /** Additional information about the domain. */
  note?: InputMaybe<Scalars['String']>;
  /** The id of the owner for the domain. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Return type for the `domainCreate` mutation. */
export type DomainCreatePayload = {
  __typename?: 'DomainCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used in the `domainUpdate` mutation. */
export type DomainUpdateInput = {
  /** The description for the domain. */
  description?: InputMaybe<Scalars['String']>;
  /** The name for the domain. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the domain. */
  note?: InputMaybe<Scalars['String']>;
  /** The id of the owner for the domain. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Return type for the `domainUpdate` mutation. */
export type DomainUpdatePayload = {
  __typename?: 'DomainUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** The group or Team owning a System or Domain. */
export type EntityOwner = Group | Team;

/** A set of processes by which to group your services by. */
export type Environment = {
  __typename?: 'Environment';
  /** A list of all environments. */
  options?: Maybe<Array<Scalars['String']>>;
};

/** The input error of a mutation. */
export type Error = {
  __typename?: 'Error';
  /** The error message. */
  message: Scalars['String'];
  /** The path to the input field with an error. */
  path: Array<Scalars['String']>;
  /** The title of the error. */
  title?: Maybe<Scalars['String']>;
};

/** The result of exporting an object as YAML. */
export type ExportConfigFilePayload = {
  __typename?: 'ExportConfigFilePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The GraphQL type that represents the exported object */
  kind?: Maybe<Scalars['String']>;
  /** The YAML representation of the object. */
  yaml?: Maybe<Scalars['String']>;
};

/** A bug/story/task from an external system (ie: Jira) associated with a service+check in OpsLevel. */
export type ExternalIssue = {
  __typename?: 'ExternalIssue';
  /** The alias to reference this external issue. */
  alias: Scalars['String'];
  /** The check associated with the external issue. */
  check: Check;
  /** The text that should be placed into the description of an external issue. */
  descriptionBlock: Scalars['String'];
  /** The id of an issue from an external system (ie: a Jira issue ID). */
  externalId?: Maybe<Scalars['String']>;
  /** A link to the issue in the external system (ie: https://myorg.atlassian.net/browse/ABC-46) */
  externalUrl?: Maybe<Scalars['String']>;
  /** The id of the external issue. */
  id: Scalars['ID'];
  /** The integration associated with the external issue. */
  integration: Integration;
  /** The service associated with the external issue. */
  service: Service;
};

/** Specifies the input fields used to create an external issue. */
export type ExternalIssueCreateInput = {
  /** The ID of the check associated with this campaign. */
  checkId: Scalars['ID'];
  /** The ID of the integration associated with this campaign. */
  integrationId: Scalars['ID'];
  /** The ID of the service associated with this campaign. */
  serviceId: Scalars['ID'];
};

/** The return type of an `externalIsseCreate` mutation. */
export type ExternalIssueCreatePayload = {
  __typename?: 'ExternalIssueCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The external issue returned by the create mutation */
  externalIssue?: Maybe<ExternalIssue>;
};

/** Specifies the input used for modifying a resource's external UUID. */
export type ExternalUuidMutationInput = {
  /** The id of the resource. */
  resourceId: Scalars['ID'];
};

/** Return type for the external UUID mutations. */
export type ExternalUuidMutationPayload = {
  __typename?: 'ExternalUuidMutationPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The updated external UUID of the resource. */
  externalUuid?: Maybe<Scalars['String']>;
};

/** A filter is used to select which services will have checks applied. It can also be used to filter services in reports. */
export type Filter = {
  __typename?: 'Filter';
  /** The logical operator to be used in conjunction with predicates. */
  connective?: Maybe<ConnectiveEnum>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the filter. */
  id: Scalars['ID'];
  /** The display name of the filter. */
  name: Scalars['String'];
  /** The path to the filter. */
  path: Scalars['String'];
  /** The predicates used to select services. */
  predicates: Array<FilterPredicate>;
};

/** The connection type for Filter. */
export type FilterConnection = {
  __typename?: 'FilterConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<FilterEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Filter>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used to create a filter. */
export type FilterCreateInput = {
  /** The logical operator to be used in conjunction with predicates. */
  connective?: InputMaybe<ConnectiveEnum>;
  /** The display name of the filter. */
  name: Scalars['String'];
  /** The list of predicates used to select which services apply to the filter. */
  predicates?: InputMaybe<Array<FilterPredicateInput>>;
};

/** The return type of a `filterCreatePayload` mutation. */
export type FilterCreatePayload = {
  __typename?: 'FilterCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly created filter. */
  filter?: Maybe<Filter>;
};

/** An edge in a connection. */
export type FilterEdge = {
  __typename?: 'FilterEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Filter>;
};

/** A condition used to select services. */
export type FilterPredicate = {
  __typename?: 'FilterPredicate';
  /** The key of the condition. */
  key: PredicateKeyEnum;
  /** Additional data used in the condition. */
  keyData?: Maybe<Scalars['String']>;
  /** Type of operation to be used in the condition. */
  type: PredicateTypeEnum;
  /** The value of the condition. */
  value?: Maybe<Scalars['String']>;
};

/** A condition that should be satisfied. */
export type FilterPredicateInput = {
  /** The condition key used by the predicate. */
  key: PredicateKeyEnum;
  /**
   * Additional data used by the predicate. This field is used by predicates with
   * key = 'tags' to specify the tag key. For example, to create a predicate for
   * services containing the tag 'db:mysql', set keyData = 'db' and value = 'mysql'.
   */
  keyData?: InputMaybe<Scalars['String']>;
  /** The condition type used by the predicate. */
  type: PredicateTypeEnum;
  /** The condition value used by the predicate. */
  value?: InputMaybe<Scalars['String']>;
};

/** Specifies the input fields used to update a filter. */
export type FilterUpdateInput = {
  /** The logical operator to be used in conjunction with predicates. */
  connective?: InputMaybe<ConnectiveEnum>;
  /** The id of the filter. */
  id: Scalars['ID'];
  /** The display name of the filter. */
  name?: InputMaybe<Scalars['String']>;
  /**
   * The list of predicates used to select which services apply to the filter. All
   * existing predicates will be replaced by these predicates.
   */
  predicates?: InputMaybe<Array<FilterPredicateInput>>;
};

/** The return type of a `filterUpdatePayload` mutation. */
export type FilterUpdatePayload = {
  __typename?: 'FilterUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The updated filter. */
  filter?: Maybe<Filter>;
};

export type FluxIntegration = Integration & {
  __typename?: 'FluxIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** The time scale type for the frequency. */
export enum FrequencyTimeScale {
  /** Consider the time scale of days. */
  Day = 'day',
  /** Consider the time scale of months. */
  Month = 'month',
  /** Consider the time scale of weeks. */
  Week = 'week',
  /** Consider the time scale of years. */
  Year = 'year'
}

export type GenericIntegration = Integration & {
  __typename?: 'GenericIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

export type GitBranchProtectionCheck = Check & {
  __typename?: 'GitBranchProtectionCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Available actions supported by the git forge integration. */
export enum GitForgeCapabilitiesTypeEnum {
  /** Integration supports cloning repositories. */
  CloneRepo = 'clone_repo',
  /** Integration supports creating new merge requests. */
  CreateMergeRequest = 'create_merge_request',
  /** Integration supports creating new repositories. */
  CreateRepo = 'create_repo',
  /** Integration supports new content to be pushed to repositories. */
  PushNewContent = 'push_new_content',
  /** Integration supports reading contents. */
  ReadContents = 'read_contents',
  /** Integration can be searched via api. */
  SearchByApi = 'search_by_api'
}

/** Parameters to find or create an external Git Repository and the associated OpsLevel Repository. */
export type GitForgesRepositoryFindOrCreateInput = {
  /** The id of the integration used to create the Git Repository */
  integrationId: Scalars['ID'];
  /** The name of the new repository */
  name: Scalars['String'];
  /** The organization to create the new repository in (only used for some GitForges) */
  organization?: InputMaybe<Scalars['String']>;
  /** The project to create the new repository in (only used for some GitForges) */
  project?: InputMaybe<Scalars['String']>;
};

/** Return type for GitForgesRepositoryFindOrCreate */
export type GitForgesRepositoryFindOrCreatePayload = {
  __typename?: 'GitForgesRepositoryFindOrCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The OpsLevel repository that represents the external repository. */
  repository?: Maybe<Repository>;
};

export type GithubActionsIntegration = Integration & {
  __typename?: 'GithubActionsIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

export type GithubIntegration = Integration & {
  __typename?: 'GithubIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** The GitHub integration's supported capabilities */
  capabilities: Array<GitForgeCapabilitiesTypeEnum>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A GitHub organization as shown in their RESTful API */
export type GithubOrganization = {
  __typename?: 'GithubOrganization';
  /** The URL to an organization avatar */
  avatarUrl: Scalars['String'];
  /** The description of the GitHub organization */
  description?: Maybe<Scalars['String']>;
  /** The URL to an organizations events */
  eventsUrl: Scalars['String'];
  /** The URL to an organizations hooks */
  hooksUrl: Scalars['String'];
  /** The id of an organization */
  id?: Maybe<Scalars['Int']>;
  /** If the user has already integrated this organization */
  integrated: Scalars['Boolean'];
  /** The URL to an organizations issues */
  issuesUrl: Scalars['String'];
  /** The display name for an organization */
  login: Scalars['String'];
  /** The URL to an organizations members */
  membersUrl: Scalars['String'];
  /** The global node ID for an organization to be used in their GraphQL API */
  nodeId: Scalars['String'];
  /** The URL to an organizations public members */
  publicMembersUrl: Scalars['String'];
  /** The URL to an organizations repositories */
  reposUrl: Scalars['String'];
  /** A URL to the webpage for a GitHub organization */
  url: Scalars['String'];
};

/** A GitHub user as shown in their RESTful API */
export type GithubUser = {
  __typename?: 'GithubUser';
  /** The URL to a users avatar */
  avatarUrl: Scalars['String'];
  /** If the user has already integrated personal repos */
  integrated: Scalars['Boolean'];
  /** The display name for a user */
  login: Scalars['String'];
};

export type GitlabIntegration = Integration & {
  __typename?: 'GitlabIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** The GitLab integration's supported capabilities */
  capabilities: Array<GitForgeCapabilitiesTypeEnum>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** The repository names that have insufficient permissions for OpsLevel to access them. */
  remoteReposWithoutProperAccessLevel: Array<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type Group = {
  __typename?: 'Group';
  /** A human-friendly, unique identifier for the group. */
  alias: Scalars['String'];
  /** A list of groups that are ancestors of this group. */
  ancestors?: Maybe<AncestorGroupsConnection>;
  /** The groups where this group is the direct parent. */
  childSubgroups?: Maybe<SubgroupConnection>;
  /** The teams where this group is the direct parent. */
  childTeams?: Maybe<TeamConnection>;
  /**
   * All the repositories that fall under this group - ex. this group's child
   * repositories, all the child repositories of this group's descendants, etc.
   */
  descendantRepositories?: Maybe<RepositoryConnection>;
  /**
   * All the services that fall under this group - ex. this group's child services,
   * all the child services of this group's descendants, etc.
   */
  descendantServices?: Maybe<ServiceConnection>;
  /** All the groups that fall under this group - ex. this group's child groups, children of those groups, etc. */
  descendantSubgroups?: Maybe<SubgroupConnection>;
  /**
   * All the teams that fall under this group - ex. this group's child teams, all
   * the child teams of this group's descendants, etc.
   */
  descendantTeams?: Maybe<TeamConnection>;
  /** The description of the group. */
  description?: Maybe<Scalars['String']>;
  /** The external UUID of this group. */
  externalUuid?: Maybe<Scalars['String']>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the group. */
  id: Scalars['ID'];
  /** The users who are members of the group. */
  members?: Maybe<UserConnection>;
  /** The name of the group. */
  name: Scalars['String'];
  /** The parent of the group. */
  parent?: Maybe<Group>;
  /** The internal ID for the group. */
  plainId: Scalars['Int'];
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupAncestorsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupChildSubgroupsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupChildTeamsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupDescendantRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<RepositorySortEnum>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupDescendantServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupDescendantSubgroupsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupDescendantTeamsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<TeamSortEnum>;
};


/** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
export type GroupMembersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for Group. */
export type GroupConnection = {
  __typename?: 'GroupConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GroupEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Group>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GroupEdge = {
  __typename?: 'GroupEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Group>;
};

/** Fields that can be used as part of filters for groups. */
export enum GroupFilterEnum {
  /** Filter by `parent` field */
  ParentId = 'parent_id'
}

/** Input to be used to filter types. */
export type GroupFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: GroupFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Specifies the input fields used to create and update a group. */
export type GroupInput = {
  /** The description of the group. */
  description?: InputMaybe<Scalars['String']>;
  /** The external UUID of this group. */
  externalUuid?: InputMaybe<Scalars['String']>;
  /** The users who are members of the group. */
  members?: InputMaybe<Array<MemberInput>>;
  /** The name of the group. */
  name?: InputMaybe<Scalars['String']>;
  /** The parent of the group */
  parent?: InputMaybe<IdentifierInput>;
  /** The teams where this group is the direct parent. */
  teams?: InputMaybe<Array<IdentifierInput>>;
};

/** Specifies the input fields used to create a group. */
export type GroupPayload = {
  __typename?: 'GroupPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A group represents a collection of teams and/or other groups used to reflect your organization's functional structure. */
  group?: Maybe<Group>;
};

/** Sort possibilities for groups. */
export enum GroupSortEnum {
  /** Order by `name` ascending */
  NameAsc = 'name_ASC',
  /** Order by `name` descending */
  NameDesc = 'name_DESC'
}

export type HasDocumentationCheck = Check & {
  __typename?: 'HasDocumentationCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The subtype of the document. */
  documentSubtype: Scalars['String'];
  /** The type of the document. */
  documentType: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** The subtype of the document. */
export enum HasDocumentationSubtypeEnum {
  /** Document is an OpenAPI document. */
  Openapi = 'openapi'
}

/** The type of the document. */
export enum HasDocumentationTypeEnum {
  /** Document is an API document. */
  Api = 'api',
  /** Document is an Tech document. */
  Tech = 'tech'
}

export type HasRecentDeployCheck = Check & {
  __typename?: 'HasRecentDeployCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** The number of days to check since the last deploy. */
  days: Scalars['Int'];
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Specifies the input fields used to identify a resource. */
export type IdentifierInput = {
  /** The human-friendly, unique identifier for the resource. */
  alias?: InputMaybe<Scalars['String']>;
  /** The id of the resource. */
  id?: InputMaybe<Scalars['ID']>;
};

/** Specifies the payload fields used to identify a resource. */
export type IdentifierPayload = {
  __typename?: 'IdentifierPayload';
  /** The human-friendly, unique identifier for the resource. */
  alias?: Maybe<Scalars['String']>;
  /** The id of the resource. */
  id?: Maybe<Scalars['ID']>;
};

/** Results of importing an Entity from Backstage into OpsLevel. */
export type ImportEntityFromBackstagePayload = {
  __typename?: 'ImportEntityFromBackstagePayload';
  /** The action taken by OpsLevel (ie: service created). */
  actionMessage: Scalars['String'];
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A link to the created or updated object in OpsLevel, if any. */
  htmlUrl?: Maybe<Scalars['String']>;
};

/** An Infrastructure Resource. */
export type InfrastructureResource = {
  __typename?: 'InfrastructureResource';
  /** The properties that describe the Infrastructure Resource. */
  data?: Maybe<Scalars['JSON']>;
  /** The identifier of the object. */
  id: Scalars['ID'];
  /** The name of the object. */
  name: Scalars['String'];
  /** The owner of the object. */
  owner?: Maybe<EntityOwner>;
  /** The source of the Infrastructure Resource. (How this data got into OpsLevel.) */
  source?: Maybe<InfrastructureSource>;
  /** The tags applied to the object. */
  tags?: Maybe<TagConnection>;
  /** The type of Infrastructure Resource. */
  type: Scalars['String'];
};


/** An Infrastructure Resource. */
export type InfrastructureResourceTagsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for InfrastructureResource. */
export type InfrastructureResourceConnection = {
  __typename?: 'InfrastructureResourceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<InfrastructureResourceEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<InfrastructureResource>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type InfrastructureResourceEdge = {
  __typename?: 'InfrastructureResourceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<InfrastructureResource>;
};

/** Source of an Infrastructure Resource */
export type InfrastructureSource = {
  __typename?: 'InfrastructureSource';
  /** The integration that enabled OpsLevel to discover the Infrastructure resource. */
  integration?: Maybe<Integration>;
  /** The last time the raw data was synchronized from the Integration platform. */
  lastSyncedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** Raw data as discovered from an integration, prior to translation. */
  rawData?: Maybe<Scalars['JSON']>;
};

/** An integration is a way of extending OpsLevel functionality. */
export type Integration = {
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

export type IntegrationCategory = {
  __typename?: 'IntegrationCategory';
  /** The display name of the integration category */
  displayName: Scalars['String'];
  /** The key to use when filtering integrations by category */
  key: Scalars['String'];
};

export enum IntegrationCategoryEnum {
  /** Alerts */
  Alerts = 'alerts',
  /** Checks */
  Checks = 'checks',
  /** CI / CD */
  CiCd = 'ci_cd',
  /** Code Quality */
  CodeQuality = 'code_quality',
  /** Communication */
  Communication = 'communication',
  /** Custom */
  Custom = 'custom',
  /** Documentation */
  Documentation = 'documentation',
  /** Error Tracking */
  ErrorTracking = 'error_tracking',
  /** Git */
  Git = 'git',
  /** Incident Management */
  IncidentManagement = 'incident_management',
  /** Infrastructure */
  Infrastructure = 'infrastructure',
  /** Issue Tracking */
  IssueTracking = 'issue_tracking',
  /** Observability */
  Observability = 'observability',
  /** Security */
  Security = 'security',
  /** User Management */
  UserManagement = 'user_management'
}

/** translation missing: en.graphql.types.integration_config.self */
export type IntegrationConfig = {
  __typename?: 'IntegrationConfig';
  /** Templates to help the creation of checks. */
  checkCreateTemplates?: Maybe<Array<CheckCreateTemplate>>;
};

/** The connection type for Integration. */
export type IntegrationConnection = {
  __typename?: 'IntegrationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<IntegrationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Integration>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Integration credential token types. */
export enum IntegrationCredentialEnum {
  /** The integration's API key. */
  ApiKey = 'api_key',
  /** The integration's app key. */
  AppKey = 'app_key'
}

/** Specifies the input fields used in the `integrationCredentialUpdate` mutation. */
export type IntegrationCredentialUpdateInput = {
  /** The id of the integration. */
  id: Scalars['ID'];
  /** The credential type to update. */
  name: IntegrationCredentialEnum;
  /** The credential value to be updated. */
  token: Scalars['String'];
};

/** Return type for the `integrationCredentialUpdate` mutation. */
export type IntegrationCredentialUpdatePayload = {
  __typename?: 'IntegrationCredentialUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Returns whether the credential update was successful. */
  success?: Maybe<Scalars['Boolean']>;
};

export type IntegrationDeauthInput = {
  /** translation missing: en.graphql.types.integration_deauth_input.force */
  force?: InputMaybe<Scalars['Boolean']>;
  /** The id of the integration. */
  id: Scalars['ID'];
};

/** The return type of a 'integrationDeauth' mutation. */
export type IntegrationDeauthPayload = {
  __typename?: 'IntegrationDeauthPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The integration which the repositories will be uninstalled. */
  integration?: Maybe<Integration>;
};

export type IntegrationDeleteInput = {
  /** The id of the integration. */
  id: Scalars['ID'];
};

/** The return type of a 'integrationDelete' mutation. */
export type IntegrationDeletePayload = {
  __typename?: 'IntegrationDeletePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The deleted integration. */
  integration?: Maybe<Integration>;
};

/** An edge in a connection. */
export type IntegrationEdge = {
  __typename?: 'IntegrationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Integration>;
};

export type IntegrationGroupAssignInput = {
  /** The id of the group. */
  groupId: Scalars['String'];
  /** The id of the integration. */
  id: Scalars['ID'];
};

/** The return type of a 'integrationGroupAssign' mutation. */
export type IntegrationGroupAssignPayload = {
  __typename?: 'IntegrationGroupAssignPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly group assigned integration. */
  integration?: Maybe<Integration>;
};

/** Sort possibilities for integrations. */
export enum IntegrationSortEnum {
  /** Order by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Order by `name` descending. */
  NameDesc = 'name_DESC'
}

export type IntegrationSyncAlertSourcesInput = {
  /** The id of the integration. */
  id: Scalars['ID'];
};

/** The return type of a `integrationSyncAlertSources` mutation. */
export type IntegrationSyncAlertSourcesPayload = {
  __typename?: 'IntegrationSyncAlertSourcesPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The integration for which the alert sources will be synced. */
  integration?: Maybe<Integration>;
};

export type IntegrationSyncReposInput = {
  /** The id of the integration. */
  id: Scalars['ID'];
};

/** The return type of a 'integrationSyncRepos' mutation. */
export type IntegrationSyncReposPayload = {
  __typename?: 'IntegrationSyncReposPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The integration which the repositories will be synced. */
  integration?: Maybe<Integration>;
};

/** The details of the PAT ownership change. */
export type IntegrationTokenOwnerChange = {
  __typename?: 'IntegrationTokenOwnerChange';
  /** Old owner login. */
  from: Scalars['String'];
  /** New owner login. */
  to: Scalars['String'];
};

export type IntegrationUpdateInput = {
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: InputMaybe<Scalars['String']>;
  /** The id of the integration. */
  id: Scalars['ID'];
  /** The name of the integration. */
  name?: InputMaybe<Scalars['String']>;
  /** The notification channel of the integration. */
  notificationChannel?: InputMaybe<Scalars['String']>;
  /**
   * Indicates if OpsLevel will create service suggestions by analyzing the repos
   * of the integration (only available for git integrations).
   */
  serviceDiscoveryEnabled?: InputMaybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. Set
   * to false in such cases where you Datadog monitors are managed through config
   * as code, the API, or if you want to manage them manually. Setting this to
   * false will require you to manually add the OpsLevel webhook to your Datadog
   * monitor message.
   */
  setWebhooksOnMonitors?: InputMaybe<Scalars['Boolean']>;
};

/** The return type of a 'integrationUpdate' mutation. */
export type IntegrationUpdatePayload = {
  __typename?: 'IntegrationUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly updated integration. */
  integration?: Maybe<Integration>;
};

/** Result of validating an integrations credentials. */
export type IntegrationValidateCredentialsPayload = {
  __typename?: 'IntegrationValidateCredentialsPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** List of organizations accessible by the access token */
  organizations?: Maybe<Array<GithubOrganization>>;
  /** Object containing the :from, :to values of the github owner login. */
  tokenOwnerChange?: Maybe<IntegrationTokenOwnerChange>;
  /** The user the the access token belongs to */
  user?: Maybe<GithubUser>;
  /** True if the supplied credentials are valid, false otherwise. */
  valid: Scalars['Boolean'];
};

/** The integration credential type to validate. */
export enum IntegrationValidateCredentialsTypeEnum {
  /** Validate a GitHub Personal Access Token. Required options: baseUrl, token. */
  GithubPersonalAccessToken = 'GITHUB_PERSONAL_ACCESS_TOKEN',
  /** Validate a GitLab Personal Access Token. Required options: baseUrl, name, token. */
  GitlabPersonalAccessToken = 'GITLAB_PERSONAL_ACCESS_TOKEN'
}

export type IssueTrackingIntegration = Integration & {
  __typename?: 'IssueTrackingIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** Search the projects in your issue tracking tool by name. */
  issueTrackingProjects: Array<IssueTrackingProject>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** translation missing: en.graphql.types.issue_tracking_integration.sites */
  sites: Array<IssueTrackingSite>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};


export type IssueTrackingIntegrationIssueTrackingProjectsArgs = {
  maxResults?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  siteId: Scalars['String'];
};

/** An issue type found in your issue tracking tool. */
export type IssueTrackingIssueType = {
  __typename?: 'IssueTrackingIssueType';
  /** The issue type's ID in the tool. */
  externalId: Scalars['String'];
  /** The issue type's name in the tool. */
  name: Scalars['String'];
};

/** A project found in your issue tracking tool. */
export type IssueTrackingProject = {
  __typename?: 'IssueTrackingProject';
  /** The project's ID in the tool. */
  externalId: Scalars['String'];
  /** The issue types associated with that project. */
  issueTypes?: Maybe<Array<IssueTrackingIssueType>>;
  /** The project's name in the tool. */
  name: Scalars['String'];
};

/** A site/subdomain found in your issue tracking tool. */
export type IssueTrackingSite = {
  __typename?: 'IssueTrackingSite';
  /** The site's ID in the tool. */
  externalId: Scalars['String'];
  /** The site's URL in the tool. */
  externalUrl: Scalars['String'];
  /** The site's name/subdomain in the tool. */
  name: Scalars['String'];
};

export type JenkinsIntegration = Integration & {
  __typename?: 'JenkinsIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

export type KubernetesIntegration = Integration & {
  __typename?: 'KubernetesIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A language that can be assigned to a repository. */
export type Language = {
  __typename?: 'Language';
  /** The name of the language */
  name: Scalars['String'];
  /** The percentage of the code written in that language */
  usage: Scalars['Float'];
};

/** A performance rating that is used to grade your services against. */
export type Level = {
  __typename?: 'Level';
  /** The human-friendly, unique identifier for the level. */
  alias?: Maybe<Scalars['String']>;
  /** The checks that belong to the level. */
  checks?: Maybe<Array<Check>>;
  /** A brief description of the level. */
  description?: Maybe<Scalars['String']>;
  /** The unique identifier for the level. */
  id: Scalars['ID'];
  /** The numerical representation of the level (highest is better). */
  index?: Maybe<Scalars['Int']>;
  /** The display name of the level. */
  name?: Maybe<Scalars['String']>;
};

/** The connection type for Level. */
export type LevelConnection = {
  __typename?: 'LevelConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<LevelEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Level>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** The total number of services in each level. */
export type LevelCount = {
  __typename?: 'LevelCount';
  /** A performance rating that is used to grade your services against. */
  level: Level;
  /** The number of services. */
  serviceCount: Scalars['Int'];
};

/** Specifies the input fields used to create a level. The new level will be added as the highest level (greatest level index). */
export type LevelCreateInput = {
  /** The description of the level. */
  description?: InputMaybe<Scalars['String']>;
  /** an integer allowing this level to be inserted between others. Must be unique per Rubric. */
  index?: InputMaybe<Scalars['Int']>;
  /** The display name of the level. */
  name: Scalars['String'];
};

/** The return type of the `levelCreate` mutation. */
export type LevelCreatePayload = {
  __typename?: 'LevelCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A performance rating that is used to grade your services against. */
  level?: Maybe<Level>;
};

/** Specifies the input fields used to delete a level. */
export type LevelDeleteInput = {
  /** The id of the level to be deleted. */
  id: Scalars['ID'];
};

/** The return type of the `levelDelete` mutation. */
export type LevelDeletePayload = {
  __typename?: 'LevelDeletePayload';
  /** The id of the deleted level. */
  deletedLevelId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type LevelEdge = {
  __typename?: 'LevelEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Level>;
};

/** Specifies the input fields used to update a level. */
export type LevelUpdateInput = {
  /** The description of the level. */
  description?: InputMaybe<Scalars['String']>;
  /** The id of the level to be updated. */
  id: Scalars['ID'];
  /** The display name of the level. */
  name?: InputMaybe<Scalars['String']>;
};

/** The return type of the `levelUpdate` mutation. */
export type LevelUpdatePayload = {
  __typename?: 'LevelUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A performance rating that is used to grade your services against. */
  level?: Maybe<Level>;
};

/** A lifecycle represents the current development stage of a service. */
export type Lifecycle = {
  __typename?: 'Lifecycle';
  /** The human-friendly, unique identifier for the lifecycle. */
  alias?: Maybe<Scalars['String']>;
  /** The lifecycle's description. */
  description?: Maybe<Scalars['String']>;
  /** The unique identifier for the lifecycle. */
  id: Scalars['ID'];
  /** The numerical representation of the lifecycle. */
  index?: Maybe<Scalars['Int']>;
  /** The lifecycle's display name. */
  name?: Maybe<Scalars['String']>;
};

export type ManualCheck = Check & {
  __typename?: 'ManualCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The start of the previous window for manual check recurring updates. */
  prevWindowStart?: Maybe<Scalars['ISO8601DateTime']>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** The start time for manual checks that require recurring updates. */
  startTime?: Maybe<Scalars['ISO8601DateTime']>;
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The minimum frequency of the updates. */
  updateFrequency?: Maybe<ManualCheckFrequency>;
  /** Whether the check requires a comment or not. */
  updateRequiresComment: Scalars['Boolean'];
  /** The url to the check. */
  url: Scalars['String'];
  /** The end of the current window for recurring updates for a manual check. */
  windowEnd?: Maybe<Scalars['ISO8601DateTime']>;
};

export type ManualCheckFrequency = {
  __typename?: 'ManualCheckFrequency';
  /** The time scale type for the frequency. */
  frequencyTimeScale: FrequencyTimeScale;
  /** The value to be used together with the frequency scale. */
  frequencyValue: Scalars['Int'];
  /** The date that the check will start to evaluate. */
  startingDate: Scalars['ISO8601DateTime'];
};

/** Defines a frequency for the check update. */
export type ManualCheckFrequencyInput = {
  /** The time scale type for the frequency. */
  frequencyTimeScale: FrequencyTimeScale;
  /** The value to be used together with the frequency scale. */
  frequencyValue: Scalars['Int'];
  /** The date that the check will start to evaluate. */
  startingDate: Scalars['ISO8601DateTime'];
};

/** Defines a frequency for the check update. */
export type ManualCheckFrequencyUpdateInput = {
  /** The time scale type for the frequency. */
  frequencyTimeScale?: InputMaybe<FrequencyTimeScale>;
  /** The value to be used together with the frequency scale. */
  frequencyValue?: InputMaybe<Scalars['Int']>;
  /** The date that the check will start to evaluate. */
  startingDate?: InputMaybe<Scalars['ISO8601DateTime']>;
};

/** Input for specifiying members on a group. */
export type MemberInput = {
  /** The user's email. */
  email: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Attaches a single alert source to a service. */
  alertSourceServiceCreate: AlertSourceServiceCreatePayload;
  /** Removes an alert source from a service. */
  alertSourceServiceDelete: AlertSourceServiceDeletePayload;
  /** Attaches alert sources to a service. */
  alertSourceServicesCreate: AlertSourceServicesCreatePayload;
  /** Creates an alias on a resource. */
  aliasCreate: AliasCreatePayload;
  /** Deletes an alias. */
  aliasDelete: AliasDeletePayload;
  /** Creates an AWS integration (Beta). */
  awsIntegrationCreate: AwsIntegrationCreatePayload;
  /** Deletes an AWS Integration from OpsLevel, along with the infra objects generated from that integration. */
  awsIntegrationDelete: ResourceDeletePayload;
  /** Updates an AWS integration (Beta). */
  awsIntegrationUpdate: AwsIntegrationUpdatePayload;
  /** Creates a campaign. */
  campaignCreate: CampaignCreatePayload;
  /** Deletes a campaign. */
  campaignDelete: DeletePayload;
  /** End a campaign and promote checks to the rubric. */
  campaignEnd: CampaignEndPayload;
  /** Schedules or updates a campaigns start and target dates. */
  campaignScheduleUpdate: CampaignScheduleUpdatePayload;
  /** Sends a reminder message to teams about incomplete work for this campaign. */
  campaignSendReminder: CampaignSendReminderPayload;
  /** Reverts a campaign to draft clearing the start and target dates. */
  campaignUnschedule: CampaignUnschedulePayload;
  /** Updates a campaign. */
  campaignUpdate: CampaignUpdatePayload;
  /** Creates a category. */
  categoryCreate: CategoryCreatePayload;
  /** Deletes a category. */
  categoryDelete: CategoryDeletePayload;
  /** Updates a category. */
  categoryUpdate: CategoryUpdatePayload;
  /** Creates an alert source usage check. */
  checkAlertSourceUsageCreate: CheckCreatePayload;
  /** Updates an alert source usage check. */
  checkAlertSourceUsageUpdate: CheckUpdatePayload;
  /** Creates a check. */
  checkCreate: CheckCreatePayload;
  /** Creates a custom check. */
  checkCustomCreate: CheckCreatePayload;
  /** Creates a custom event check. */
  checkCustomEventCreate: CheckCreatePayload;
  /** Updates a custom event check. */
  checkCustomEventUpdate: CheckCreatePayload;
  /** Updates a custom check. */
  checkCustomUpdate: CheckUpdatePayload;
  /** Deletes a check. */
  checkDelete: CheckDeletePayload;
  /** Creates a branch protection check */
  checkGitBranchProtectionCreate: CheckCreatePayload;
  /** Updates a branch protection check */
  checkGitBranchProtectionUpdate: CheckCreatePayload;
  /** Creates a documentation check. */
  checkHasDocumentationCreate: CheckCreatePayload;
  /** Updates a documentation check. */
  checkHasDocumentationUpdate: CheckUpdatePayload;
  /** Creates a recent deploy check. */
  checkHasRecentDeployCreate: CheckCreatePayload;
  /** Updates a recent deploy check. */
  checkHasRecentDeployUpdate: CheckCreatePayload;
  /** Creates a manual check. */
  checkManualCreate: CheckCreatePayload;
  /** Updates a manual check. */
  checkManualUpdate: CheckUpdatePayload;
  /** Creates a payload check. */
  checkPayloadCreate: CheckCreatePayload;
  /** Updates a payload check. */
  checkPayloadUpdate: CheckUpdatePayload;
  /** Creates a repository file check. */
  checkRepositoryFileCreate: CheckCreatePayload;
  /** Updates a repository file check. */
  checkRepositoryFileUpdate: CheckUpdatePayload;
  /** Creates a repository grep check. */
  checkRepositoryGrepCreate: CheckCreatePayload;
  /** Updates a repository grep check. */
  checkRepositoryGrepUpdate: CheckUpdatePayload;
  /** Creates a repository integrated check. */
  checkRepositoryIntegratedCreate: CheckCreatePayload;
  /** Updates a repository integrated check. */
  checkRepositoryIntegratedUpdate: CheckUpdatePayload;
  /** Creates a repo search check. */
  checkRepositorySearchCreate: CheckCreatePayload;
  /** Updates a repository search check. */
  checkRepositorySearchUpdate: CheckUpdatePayload;
  /** Creates a service configuration check. */
  checkServiceConfigurationCreate: CheckCreatePayload;
  /** Updates a service configuration check. */
  checkServiceConfigurationUpdate: CheckUpdatePayload;
  /** Creates a service dependency check. */
  checkServiceDependencyCreate: CheckCreatePayload;
  /** Updates a service dependency check. */
  checkServiceDependencyUpdate: CheckUpdatePayload;
  /** Creates a service ownership check. */
  checkServiceOwnershipCreate: CheckCreatePayload;
  /** Updates a service ownership check. */
  checkServiceOwnershipUpdate: CheckUpdatePayload;
  /** Creates a service property check. */
  checkServicePropertyCreate: CheckCreatePayload;
  /** Updates a service property check. */
  checkServicePropertyUpdate: CheckUpdatePayload;
  /** Creates a tag defined check. */
  checkTagDefinedCreate: CheckCreatePayload;
  /** Updates a tag defined check. */
  checkTagDefinedUpdate: CheckUpdatePayload;
  /** Creates a tool usage check. */
  checkToolUsageCreate: CheckCreatePayload;
  /** Updates a tool usage check. */
  checkToolUsageUpdate: CheckUpdatePayload;
  /** Updates a check. */
  checkUpdate: CheckUpdatePayload;
  /** Parses a yaml representation of a check. */
  checkYamlParse: CheckYamlParsePayload;
  /** Copies selected rubric checks to an existing campaign. */
  checksCopyToCampaign: ChecksCopyToCampaignPayload;
  /** Creates a new contact for a team. */
  contactCreate: ContactCreatePayload;
  /** Deletes a contact. */
  contactDelete: ContactDeletePayload;
  /** Updates a contact's attributes. */
  contactUpdate: ContactUpdatePayload;
  /** Creates a Trigger Definition for Custom Actions in OpsLevel. */
  customActionsTriggerDefinitionCreate: CustomActionsTriggerDefinitionCreatePayload;
  /** Deletes a Trigger Definition for Custom Actions in OpsLevel. */
  customActionsTriggerDefinitionDelete: ResourceDeletePayload;
  /** Updates a Trigger Definition for Custom Actions in OpsLevel. */
  customActionsTriggerDefinitionUpdate: CustomActionsTriggerDefinitionUpdatePayload;
  /** Invoke a custom action trigger definition for a user. */
  customActionsTriggerInvoke: CustomActionsTriggerInvokePayload;
  /** Validate a template for a Custom Action. */
  customActionsValidateTemplate: CustomActionsValidateTemplatePayloadType;
  /** Creates a Webhook Action for Custom Actions in OpsLevel. */
  customActionsWebhookActionCreate: CustomActionsWebhookActionCreatePayload;
  /** Deletes a Webhook Action for Custom Actions in OpsLevel. */
  customActionsWebhookActionDelete: ResourceDeletePayload;
  /** Updates a Webhook Action for Custom Actions in OpsLevel. */
  customActionsWebhookActionUpdate: CustomActionsWebhookActionUpdatePayload;
  /** Updates the credentials for a datadog integration. */
  datadogCredentialsUpdate: DatadogCredentialsUpdatePayload;
  /** Delete a deploy. */
  deployDelete: DeletePayload;
  /** Assign Systems as children of a Domain. */
  domainChildAssign: DomainChildAssignPayload;
  /** Disconnect Systems from their parent Domain. */
  domainChildRemove: DomainChildRemovePayload;
  /** Creates a domain. */
  domainCreate: DomainCreatePayload;
  /** Deletes a domain. */
  domainDelete: ResourceDeletePayload;
  /** Updates a domain. */
  domainUpdate: DomainUpdatePayload;
  /** translation missing: en.graphql.mutations.external_issue_create.self */
  externalIssueCreate: ExternalIssueCreatePayload;
  /** Creates an external UUID for a resource (ex. Service). */
  externalUuidCreate: ExternalUuidMutationPayload;
  /** Deletes a resource's external UUID. */
  externalUuidDelete: ExternalUuidMutationPayload;
  /** Creates a filter. */
  filterCreate: FilterCreatePayload;
  /** Deletes a filter. */
  filterDelete: DeletePayload;
  /** Updates a filter. */
  filterUpdate: FilterUpdatePayload;
  /** Find or create an external GitForge repository and OpsLevel repository */
  gitForgesRepositoryFindOrCreate: GitForgesRepositoryFindOrCreatePayload;
  /** Create a group. */
  groupCreate: GroupPayload;
  /** Delete a group. */
  groupDelete: ResourceDeletePayload;
  /** Update a group. */
  groupUpdate: GroupPayload;
  /** Given a Backstage Entity, create or update the corresponding object in OpsLevel. */
  importEntityFromBackstage: ImportEntityFromBackstagePayload;
  /** Update integration API or App keys. Supported integrations: Datadog and Opsgenie. */
  integrationCredentialUpdate: IntegrationCredentialUpdatePayload;
  /** translation missing: en.graphql.mutations.integration_deauth.self */
  integrationDeauth: IntegrationDeauthPayload;
  /** Delete an installed integration. Currently supports only Git integrations. */
  integrationDelete: IntegrationDeletePayload;
  /** Assign group to integration. */
  integrationGroupAssign: IntegrationGroupAssignPayload;
  /** Trigger the synchronization of alert sources. */
  integrationSyncAlertSources: IntegrationSyncAlertSourcesPayload;
  /** Trigger the synchronization of repositories. */
  integrationSyncRepos: IntegrationSyncReposPayload;
  /** Update an integration's attributes. */
  integrationUpdate: IntegrationUpdatePayload;
  /** Validate an integrations credentials. */
  integrationValidateCredentials: IntegrationValidateCredentialsPayload;
  /** Creates a level. */
  levelCreate: LevelCreatePayload;
  /** Deletes a level. */
  levelDelete: LevelDeletePayload;
  /** Updates a level. */
  levelUpdate: LevelUpdatePayload;
  /** Updates repositories attributes in a bulk operation. */
  repositoriesUpdate: RepositoriesUpdatePayload;
  /** Updates repositories attributes in a bulk operation. */
  repositoryBulkUpdate: RepositoryBulkUpdatePayload;
  /** Deletes a repository. */
  repositoryDelete: DeletePayload;
  /** Updates a repository's attributes. */
  repositoryUpdate: RepositoryUpdatePayload;
  /** Updates the status of a ResourceDocument. */
  resourceDocumentStatusUpdate: ResourceDocumentStatusUpdatePayload;
  /** Updates a rubric. */
  rubricUpdate: RubricUpdatePayload;
  /** Appends a log chunk to a runnerJob's logs. */
  runnerAppendJobLog: RunnerAppendJobLogPayload;
  /** Assign a pending job to a runner. */
  runnerGetPendingJob: RunnerGetPendingJobPayload;
  /** Register an OpsLevel Runner to consume jobs. */
  runnerRegister: RunnerRegisterPayload;
  /** Updates a runnerJob outcome and status. */
  runnerReportJobOutcome: RunnerReportJobOutcomePayload;
  /** Stop an OpsLevel Runner from consuming jobs. */
  runnerUnregister: RunnerUnregisterPayload;
  /** Updates the API Docs settings for a service. */
  serviceApiDocSettingsUpdate: ServiceUpdatePayload;
  /** Creates a service. */
  serviceCreate: ServiceCreatePayload;
  /** Deletes a service. */
  serviceDelete: ServiceDeletePayload;
  /** Assigns service dependencies. */
  serviceDependenciesAssign: ServiceDependenciesAssignPayload;
  /** Deletes service dependencies. */
  serviceDependenciesDelete: ServiceDependenciesDeletePayload;
  /** Create a dependency from one service to another. */
  serviceDependencyCreate: ServiceDependencyPayload;
  /** Deletes a service dependency. */
  serviceDependencyDelete: DeletePayload;
  /** translation missing: en.graphql.mutations.service_from_template_create.self */
  serviceFromTemplateCreate: ServiceFromTemplateCreatePayload;
  /** Updates a service note. */
  serviceNoteUpdate: ServiceNoteUpdatePayload;
  /** Links a repository to a service. */
  serviceRepositoryCreate: ServiceRepositoryCreatePayload;
  /** Deletes a service repository. */
  serviceRepositoryDelete: DeletePayload;
  /** Updates a service repository. */
  serviceRepositoryUpdate: ServiceRepositoryUpdatePayload;
  /** Creates a service template from a provided URL. */
  serviceTemplateCreate: ServiceTemplateCreatePayload;
  /** Deletes a service template. */
  serviceTemplateDelete: DeletePayload;
  /** Updates the specified service template. */
  serviceTemplateUpdate: ServiceTemplateUpdatePayload;
  /** Parses the service template variables. */
  serviceTemplateVariablesParse: ServiceTemplateVariablesParsePayload;
  /** Updates a service. */
  serviceUpdate: ServiceUpdatePayload;
  /** Bulk delete services. */
  servicesDelete: ServicesDeletePayload;
  /** Creates the webhook signing secret for the current account. */
  signingSecretCreate: SigningSecretCreatePayload;
  /** Deletes the webhook signing secret for the current account. */
  signingSecretDelete: SigningSecretDeletePayload;
  /** Unsubscribe from receiving a notification via a notification channel. */
  subscriptionChannelDelete: DeletePayload;
  /** Subscribe to receive a notification via a notification channel. */
  subscriptionCreate: SubscriptionCreatePayload;
  /** Creates services and attaches aliases based on suggested actions. */
  suggestionAction: SuggestionsActionPayload;
  /** Updates a suggestion's attributes. */
  suggestionUpdate: SuggestionUpdatePayload;
  /** Assign Services as children of a System. */
  systemChildAssign: SystemChildAssignPayload;
  /** Disconnect Services from their parent System. */
  systemChildRemove: SystemChildRemovePayload;
  /** Creates a system. */
  systemCreate: SystemCreatePayload;
  /** Deletes a system. */
  systemDelete: ResourceDeletePayload;
  /** Updates a system. */
  systemUpdate: SystemUpdatePayload;
  /** Creates new tags on a resource, replacing any existing keys specified in the payload. */
  tagAssign: TagAssignPayload;
  /** Creates a tag. */
  tagCreate: TagCreatePayload;
  /** Deletes a tag. */
  tagDelete: TagDeletePayload;
  /** Updates a tag's attributes. */
  tagUpdate: TagUpdatePayload;
  /** Creates a new team. */
  teamCreate: TeamCreatePayload;
  /** Deletes a team. */
  teamDelete: TeamDeletePayload;
  /** Add members to a team */
  teamMembershipCreate: TeamMembershipCreatePayload;
  /** Remove members from a team */
  teamMembershipDelete: TeamMembershipDeletePayload;
  /** Updates a team's attributes. */
  teamUpdate: TeamUpdatePayload;
  /** Creates a new tool attached to a service. */
  toolCreate: ToolCreatePayload;
  /** Deletes a tool. */
  toolDelete: ToolDeletePayload;
  /** Updates a tool's attributes. */
  toolUpdate: ToolUpdatePayload;
  /** Delete a user. */
  userDelete: UserDeletePayload;
  /** Invite a new user to the account. */
  userInvite: UserPayload;
  /** Update a user. */
  userUpdate: UserPayload;
};


export type MutationAlertSourceServiceCreateArgs = {
  input: AlertSourceServiceCreateInput;
};


export type MutationAlertSourceServiceDeleteArgs = {
  input: AlertSourceServiceDeleteInput;
};


export type MutationAlertSourceServicesCreateArgs = {
  input: AlertSourceServicesCreateInput;
};


export type MutationAliasCreateArgs = {
  input: AliasCreateInput;
};


export type MutationAliasDeleteArgs = {
  input: AliasDeleteInput;
};


export type MutationAwsIntegrationCreateArgs = {
  input: AwsIntegrationCreateInput;
};


export type MutationAwsIntegrationDeleteArgs = {
  resource: IdentifierInput;
};


export type MutationAwsIntegrationUpdateArgs = {
  input: AwsIntegrationUpdateInput;
};


export type MutationCampaignCreateArgs = {
  input: CampaignCreateInput;
};


export type MutationCampaignDeleteArgs = {
  input: DeleteInput;
};


export type MutationCampaignEndArgs = {
  input: CampaignEndInput;
};


export type MutationCampaignScheduleUpdateArgs = {
  input: CampaignScheduleUpdateInput;
};


export type MutationCampaignSendReminderArgs = {
  input: CampaignSendReminderInput;
};


export type MutationCampaignUnscheduleArgs = {
  input: CampaignUnscheduleInput;
};


export type MutationCampaignUpdateArgs = {
  input: CampaignUpdateInput;
};


export type MutationCategoryCreateArgs = {
  input: CategoryCreateInput;
};


export type MutationCategoryDeleteArgs = {
  input: CategoryDeleteInput;
};


export type MutationCategoryUpdateArgs = {
  input: CategoryUpdateInput;
};


export type MutationCheckAlertSourceUsageCreateArgs = {
  input: CheckAlertSourceUsageCreateInput;
};


export type MutationCheckAlertSourceUsageUpdateArgs = {
  input: CheckAlertSourceUsageUpdateInput;
};


export type MutationCheckCreateArgs = {
  input: CheckCreateInput;
};


export type MutationCheckCustomCreateArgs = {
  input: CheckCustomCreateInput;
};


export type MutationCheckCustomEventCreateArgs = {
  input: CheckCustomEventCreateInput;
};


export type MutationCheckCustomEventUpdateArgs = {
  input: CheckCustomEventUpdateInput;
};


export type MutationCheckCustomUpdateArgs = {
  input: CheckCustomUpdateInput;
};


export type MutationCheckDeleteArgs = {
  input: CheckDeleteInput;
};


export type MutationCheckGitBranchProtectionCreateArgs = {
  input: CheckGitBranchProtectionCreateInput;
};


export type MutationCheckGitBranchProtectionUpdateArgs = {
  input: CheckGitBranchProtectionUpdateInput;
};


export type MutationCheckHasDocumentationCreateArgs = {
  input: CheckHasDocumentationCreateInput;
};


export type MutationCheckHasDocumentationUpdateArgs = {
  input: CheckHasDocumentationUpdateInput;
};


export type MutationCheckHasRecentDeployCreateArgs = {
  input: CheckHasRecentDeployCreateInput;
};


export type MutationCheckHasRecentDeployUpdateArgs = {
  input: CheckHasRecentDeployUpdateInput;
};


export type MutationCheckManualCreateArgs = {
  input: CheckManualCreateInput;
};


export type MutationCheckManualUpdateArgs = {
  input: CheckManualUpdateInput;
};


export type MutationCheckPayloadCreateArgs = {
  input: CheckPayloadCreateInput;
};


export type MutationCheckPayloadUpdateArgs = {
  input: CheckPayloadUpdateInput;
};


export type MutationCheckRepositoryFileCreateArgs = {
  input: CheckRepositoryFileCreateInput;
};


export type MutationCheckRepositoryFileUpdateArgs = {
  input: CheckRepositoryFileUpdateInput;
};


export type MutationCheckRepositoryGrepCreateArgs = {
  input: CheckRepositoryGrepCreateInput;
};


export type MutationCheckRepositoryGrepUpdateArgs = {
  input: CheckRepositoryGrepUpdateInput;
};


export type MutationCheckRepositoryIntegratedCreateArgs = {
  input: CheckRepositoryIntegratedCreateInput;
};


export type MutationCheckRepositoryIntegratedUpdateArgs = {
  input: CheckRepositoryIntegratedUpdateInput;
};


export type MutationCheckRepositorySearchCreateArgs = {
  input: CheckRepositorySearchCreateInput;
};


export type MutationCheckRepositorySearchUpdateArgs = {
  input: CheckRepositorySearchUpdateInput;
};


export type MutationCheckServiceConfigurationCreateArgs = {
  input: CheckServiceConfigurationCreateInput;
};


export type MutationCheckServiceConfigurationUpdateArgs = {
  input: CheckServiceConfigurationUpdateInput;
};


export type MutationCheckServiceDependencyCreateArgs = {
  input: CheckServiceDependencyCreateInput;
};


export type MutationCheckServiceDependencyUpdateArgs = {
  input: CheckServiceDependencyUpdateInput;
};


export type MutationCheckServiceOwnershipCreateArgs = {
  input: CheckServiceOwnershipCreateInput;
};


export type MutationCheckServiceOwnershipUpdateArgs = {
  input: CheckServiceOwnershipUpdateInput;
};


export type MutationCheckServicePropertyCreateArgs = {
  input: CheckServicePropertyCreateInput;
};


export type MutationCheckServicePropertyUpdateArgs = {
  input: CheckServicePropertyUpdateInput;
};


export type MutationCheckTagDefinedCreateArgs = {
  input: CheckTagDefinedCreateInput;
};


export type MutationCheckTagDefinedUpdateArgs = {
  input: CheckTagDefinedUpdateInput;
};


export type MutationCheckToolUsageCreateArgs = {
  input: CheckToolUsageCreateInput;
};


export type MutationCheckToolUsageUpdateArgs = {
  input: CheckToolUsageUpdateInput;
};


export type MutationCheckUpdateArgs = {
  input: CheckUpdateInput;
};


export type MutationCheckYamlParseArgs = {
  input: CheckYamlParseInput;
};


export type MutationChecksCopyToCampaignArgs = {
  input: ChecksCopyToCampaignInput;
};


export type MutationContactCreateArgs = {
  input: ContactCreateInput;
};


export type MutationContactDeleteArgs = {
  input: ContactDeleteInput;
};


export type MutationContactUpdateArgs = {
  input: ContactUpdateInput;
};


export type MutationCustomActionsTriggerDefinitionCreateArgs = {
  input: CustomActionsTriggerDefinitionCreateInput;
};


export type MutationCustomActionsTriggerDefinitionDeleteArgs = {
  resource: IdentifierInput;
};


export type MutationCustomActionsTriggerDefinitionUpdateArgs = {
  input: CustomActionsTriggerDefinitionUpdateInput;
};


export type MutationCustomActionsTriggerInvokeArgs = {
  input: CustomActionsTriggerInvokeInput;
};


export type MutationCustomActionsValidateTemplateArgs = {
  template: Scalars['String'];
};


export type MutationCustomActionsWebhookActionCreateArgs = {
  input: CustomActionsWebhookActionCreateInput;
};


export type MutationCustomActionsWebhookActionDeleteArgs = {
  resource: IdentifierInput;
};


export type MutationCustomActionsWebhookActionUpdateArgs = {
  input: CustomActionsWebhookActionUpdateInput;
};


export type MutationDatadogCredentialsUpdateArgs = {
  input: DatadogCredentialsUpdateInput;
};


export type MutationDeployDeleteArgs = {
  input: DeleteInput;
};


export type MutationDomainChildAssignArgs = {
  childSystems: Array<IdentifierInput>;
  domain: IdentifierInput;
};


export type MutationDomainChildRemoveArgs = {
  childSystems: Array<IdentifierInput>;
  domain: IdentifierInput;
};


export type MutationDomainCreateArgs = {
  input: DomainCreateInput;
};


export type MutationDomainDeleteArgs = {
  resource: IdentifierInput;
};


export type MutationDomainUpdateArgs = {
  domain: IdentifierInput;
  input: DomainUpdateInput;
};


export type MutationExternalIssueCreateArgs = {
  input: ExternalIssueCreateInput;
};


export type MutationExternalUuidCreateArgs = {
  input: ExternalUuidMutationInput;
};


export type MutationExternalUuidDeleteArgs = {
  input: ExternalUuidMutationInput;
};


export type MutationFilterCreateArgs = {
  input: FilterCreateInput;
};


export type MutationFilterDeleteArgs = {
  input: DeleteInput;
};


export type MutationFilterUpdateArgs = {
  input: FilterUpdateInput;
};


export type MutationGitForgesRepositoryFindOrCreateArgs = {
  input: GitForgesRepositoryFindOrCreateInput;
};


export type MutationGroupCreateArgs = {
  input: GroupInput;
};


export type MutationGroupDeleteArgs = {
  resource: IdentifierInput;
};


export type MutationGroupUpdateArgs = {
  group: IdentifierInput;
  input: GroupInput;
};


export type MutationImportEntityFromBackstageArgs = {
  entity: Scalars['JSON'];
  entityRef: Scalars['String'];
};


export type MutationIntegrationCredentialUpdateArgs = {
  input: IntegrationCredentialUpdateInput;
};


export type MutationIntegrationDeauthArgs = {
  input: IntegrationDeauthInput;
};


export type MutationIntegrationDeleteArgs = {
  input: IntegrationDeleteInput;
};


export type MutationIntegrationGroupAssignArgs = {
  input: IntegrationGroupAssignInput;
};


export type MutationIntegrationSyncAlertSourcesArgs = {
  input: IntegrationSyncAlertSourcesInput;
};


export type MutationIntegrationSyncReposArgs = {
  input: IntegrationSyncReposInput;
};


export type MutationIntegrationUpdateArgs = {
  input: IntegrationUpdateInput;
};


export type MutationIntegrationValidateCredentialsArgs = {
  options: Scalars['JSON'];
  type: IntegrationValidateCredentialsTypeEnum;
};


export type MutationLevelCreateArgs = {
  input: LevelCreateInput;
};


export type MutationLevelDeleteArgs = {
  input: LevelDeleteInput;
};


export type MutationLevelUpdateArgs = {
  input: LevelUpdateInput;
};


export type MutationRepositoriesUpdateArgs = {
  owner?: InputMaybe<IdentifierInput>;
  repositories: Array<IdentifierInput>;
  syncLinkedServices?: InputMaybe<Scalars['Boolean']>;
  visible?: InputMaybe<Scalars['Boolean']>;
};


export type MutationRepositoryBulkUpdateArgs = {
  input: RepositoryBulkUpdateInput;
  syncLinkedServices?: InputMaybe<Scalars['Boolean']>;
};


export type MutationRepositoryDeleteArgs = {
  input: DeleteInput;
};


export type MutationRepositoryUpdateArgs = {
  input: RepositoryUpdateInput;
  syncLinkedServices?: InputMaybe<Scalars['Boolean']>;
};


export type MutationResourceDocumentStatusUpdateArgs = {
  input: ResourceDocumentStatusUpdateInput;
};


export type MutationRubricUpdateArgs = {
  input: RubricUpdateInput;
};


export type MutationRunnerAppendJobLogArgs = {
  input: RunnerAppendJobLogInput;
};


export type MutationRunnerGetPendingJobArgs = {
  lastUpdateToken?: InputMaybe<Scalars['ID']>;
  runnerId: Scalars['ID'];
};


export type MutationRunnerReportJobOutcomeArgs = {
  input: RunnerReportJobOutcomeInput;
};


export type MutationRunnerUnregisterArgs = {
  runnerId: Scalars['ID'];
};


export type MutationServiceApiDocSettingsUpdateArgs = {
  apiDocumentPath?: InputMaybe<Scalars['String']>;
  preferredApiDocumentSource?: InputMaybe<ApiDocumentSourceEnum>;
  service: IdentifierInput;
};


export type MutationServiceCreateArgs = {
  input: ServiceCreateInput;
};


export type MutationServiceDeleteArgs = {
  input: ServiceDeleteInput;
};


export type MutationServiceDependenciesAssignArgs = {
  input: ServiceDependenciesAssignInput;
};


export type MutationServiceDependenciesDeleteArgs = {
  input: ServiceDependenciesDeleteInput;
};


export type MutationServiceDependencyCreateArgs = {
  inputV2?: InputMaybe<ServiceDependencyCreateInput>;
};


export type MutationServiceDependencyDeleteArgs = {
  input: DeleteInput;
};


export type MutationServiceFromTemplateCreateArgs = {
  input: ServiceFromTemplateCreateInput;
};


export type MutationServiceNoteUpdateArgs = {
  input: ServiceNoteUpdateInput;
};


export type MutationServiceRepositoryCreateArgs = {
  input: ServiceRepositoryCreateInput;
};


export type MutationServiceRepositoryDeleteArgs = {
  input: DeleteInput;
};


export type MutationServiceRepositoryUpdateArgs = {
  input: ServiceRepositoryUpdateInput;
};


export type MutationServiceTemplateCreateArgs = {
  input: ServiceTemplateCreateInput;
};


export type MutationServiceTemplateDeleteArgs = {
  input: DeleteInput;
};


export type MutationServiceTemplateUpdateArgs = {
  input: ServiceTemplateUpdateInput;
};


export type MutationServiceTemplateVariablesParseArgs = {
  input: ServiceTemplateVariablesParseInput;
};


export type MutationServiceUpdateArgs = {
  input: ServiceUpdateInput;
};


export type MutationServicesDeleteArgs = {
  services: Array<IdentifierInput>;
};


export type MutationSubscriptionChannelDeleteArgs = {
  input: DeleteInput;
};


export type MutationSubscriptionCreateArgs = {
  input: SubscriptionCreateInput;
};


export type MutationSuggestionActionArgs = {
  input: SuggestionActionInput;
};


export type MutationSuggestionUpdateArgs = {
  input: SuggestionUpdateInput;
};


export type MutationSystemChildAssignArgs = {
  childServices: Array<IdentifierInput>;
  system: IdentifierInput;
};


export type MutationSystemChildRemoveArgs = {
  childServices: Array<IdentifierInput>;
  system: IdentifierInput;
};


export type MutationSystemCreateArgs = {
  input: SystemCreateInput;
};


export type MutationSystemDeleteArgs = {
  resource: IdentifierInput;
};


export type MutationSystemUpdateArgs = {
  input: SystemUpdateInput;
  system: IdentifierInput;
};


export type MutationTagAssignArgs = {
  input: TagAssignInput;
};


export type MutationTagCreateArgs = {
  input: TagCreateInput;
};


export type MutationTagDeleteArgs = {
  input: TagDeleteInput;
};


export type MutationTagUpdateArgs = {
  input: TagUpdateInput;
};


export type MutationTeamCreateArgs = {
  input: TeamCreateInput;
};


export type MutationTeamDeleteArgs = {
  input: TeamDeleteInput;
};


export type MutationTeamMembershipCreateArgs = {
  input: TeamMembershipCreateInput;
};


export type MutationTeamMembershipDeleteArgs = {
  input: TeamMembershipDeleteInput;
};


export type MutationTeamUpdateArgs = {
  input: TeamUpdateInput;
};


export type MutationToolCreateArgs = {
  input: ToolCreateInput;
};


export type MutationToolDeleteArgs = {
  input: ToolDeleteInput;
};


export type MutationToolUpdateArgs = {
  input: ToolUpdateInput;
};


export type MutationUserDeleteArgs = {
  user: UserIdentifierInput;
};


export type MutationUserInviteArgs = {
  email: Scalars['String'];
  input: UserInput;
};


export type MutationUserUpdateArgs = {
  input: UserInput;
  user: UserIdentifierInput;
};

/** A notification that can be sent to users on this account. */
export type Notification = {
  __typename?: 'Notification';
  /** Channels the notification can be sent through. */
  availableChannels: Array<NotificationChannelTypeEnum>;
  /** What the notification is for. */
  description: Scalars['String'];
  /** The ID of the notification. */
  id: Scalars['ID'];
  /** The name of the notification. */
  name: Scalars['String'];
  /** The type of the notification. */
  type: Scalars['String'];
};

/** Possible notification channels. */
export enum NotificationChannelTypeEnum {
  /** Send the notification through email. */
  Email = 'email',
  /** Send the notification through slack. */
  Slack = 'slack'
}

/** The connection type for Notification. */
export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<NotificationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Notification>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Notification>;
};

export type OctopusDeployIntegration = Integration & {
  __typename?: 'OctopusDeployIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** An on call record for a given source */
export type OnCall = {
  __typename?: 'OnCall';
  /** Email of the user on call */
  externalEmail: Scalars['String'];
  /** A link to a user's gravatar image */
  gravatarHref?: Maybe<Scalars['String']>;
  /** The ID of the on call. */
  id: Scalars['ID'];
  /** Name of the user on call */
  name: Scalars['String'];
  /** The associated OpsLevel user record */
  user?: Maybe<User>;
  /** A link to the HTML page for the user resource. Ex. https://app.opslevel.com/users/1 */
  userHref?: Maybe<Scalars['String']>;
};

/** The connection type for OnCall. */
export type OnCallConnection = {
  __typename?: 'OnCallConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<OnCallEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<OnCall>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type OnCallEdge = {
  __typename?: 'OnCallEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<OnCall>;
};

/** Sort possibilities for on calls. */
export enum OnCallSortEnum {
  /** Sort by `external_email` ascending. */
  ExternalEmailAsc = 'external_email_ASC',
  /** Sort by `external_email` descending. */
  ExternalEmailDesc = 'external_email_DESC',
  /** Sort by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Sort by `name` descending. */
  NameDesc = 'name_DESC'
}

export type OnPremGitlabIntegration = Integration & {
  __typename?: 'OnPremGitlabIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** The on-prem GitLab integration's supported capabilities */
  capabilities: Array<GitForgeCapabilitiesTypeEnum>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** The repository names that have insufficient permissions for OpsLevel to access them */
  remoteReposWithoutProperAccessLevel: Array<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

export type OpsgenieIntegration = Integration & {
  __typename?: 'OpsgenieIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']>;
};

export type PagerdutyIntegration = Integration & {
  __typename?: 'PagerdutyIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

export type Payload = {
  __typename?: 'Payload';
  /** The time at which the payload was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The payload body that was sent. */
  data?: Maybe<Scalars['JSON']>;
  /** The id of the payload. */
  id: Scalars['ID'];
  /** The integration that the payload was sent to. */
  integration: Integration;
  /** The time at which the payload was processed as part of check evaluation. */
  processedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The query params sent with the payload. */
  queryParams: Scalars['String'];
  /** The time at which the payload was updated. */
  updatedAt: Scalars['ISO8601DateTime'];
};

export type PayloadCheck = Check & {
  __typename?: 'PayloadCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /**
   * A jq expression that will be ran against your payload to evaluate the check
   * result. A truthy value will result in the check passing.
   */
  jqExpression: Scalars['String'];
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** The check result message template. */
  resultMessage?: Maybe<Scalars['String']>;
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** The connection type for Payload. */
export type PayloadConnection = {
  __typename?: 'PayloadConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<PayloadEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Payload>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type PayloadEdge = {
  __typename?: 'PayloadEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Payload>;
};

/** Fields that can be used as part of filters for payloads. */
export enum PayloadFilterEnum {
  /** Filter by `integration` field. Note that this is an internal id, ex. "123". */
  IntegrationId = 'integration_id'
}

/** Input to be used to filter types. */
export type PayloadFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: PayloadFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

export type PayloadIntegration = Integration & {
  __typename?: 'PayloadIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** Sort possibilities for payloads. */
export enum PayloadSortEnum {
  /** Order by `created_at` ascending */
  CreatedAtAsc = 'created_at_ASC',
  /** Order by `created_at` descending */
  CreatedAtDesc = 'created_at_DESC',
  /** Order by `processed_at` ascending */
  ProcessedAtAsc = 'processed_at_ASC',
  /** Order by `processed_at` descending */
  ProcessedAtDesc = 'processed_at_DESC'
}

/** A condition used to select services. */
export type Predicate = {
  __typename?: 'Predicate';
  /** Type of operation to be used in the condition. */
  type: PredicateTypeEnum;
  /** The value of the condition. */
  value?: Maybe<Scalars['String']>;
};

/** A condition that should be satisfied. */
export type PredicateInput = {
  /** The condition type used by the predicate. */
  type: PredicateTypeEnum;
  /** The condition value used by the predicate. */
  value?: InputMaybe<Scalars['String']>;
};

/** Fields that can be used as part of filter for services. */
export enum PredicateKeyEnum {
  /** Filter by the creation source. */
  CreationSource = 'creation_source',
  /** Filter by `framework` field */
  Framework = 'framework',
  /** Filter by group hierarchy. Will return resources who's owner is in the group ancestry chain. */
  GroupIds = 'group_ids',
  /** Filter by `language` field */
  Language = 'language',
  /** Filter by `lifecycle` field */
  LifecycleIndex = 'lifecycle_index',
  /** Filter by `name` field */
  Name = 'name',
  /** Filter by `owner` field */
  OwnerId = 'owner_id',
  /** Filter by `product` field */
  Product = 'product',
  /** Filter by `tags` field. */
  Tags = 'tags',
  /** Filter by `tier` field */
  TierIndex = 'tier_index'
}

/** Operations that can be used on predicates. */
export enum PredicateTypeEnum {
  /** Belongs to a group's hierarchy. */
  BelongsTo = 'belongs_to',
  /** Contains a specific value. */
  Contains = 'contains',
  /** Does not contain a specific value. */
  DoesNotContain = 'does_not_contain',
  /** Does not equal a specific value. */
  DoesNotEqual = 'does_not_equal',
  /** Specific attribute does not exist. */
  DoesNotExist = 'does_not_exist',
  /** Ends with a specific value. */
  EndsWith = 'ends_with',
  /** Equals a specific value. */
  Equals = 'equals',
  /** Specific attribute exists. */
  Exists = 'exists',
  /** Greater than or equal to a specific value (numeric only). */
  GreaterThanOrEqualTo = 'greater_than_or_equal_to',
  /** Less than or equal to a specific value (numeric only). */
  LessThanOrEqualTo = 'less_than_or_equal_to',
  /** Matches a value using a regular expression. */
  MatchesRegex = 'matches_regex',
  /** Satisfies an expression defined in jq. */
  SatisfiesJqExpression = 'satisfies_jq_expression',
  /** Satisfies version constraint (tag value only). */
  SatisfiesVersionConstraint = 'satisfies_version_constraint',
  /** Starts with a specific value. */
  StartsWith = 'starts_with'
}

/** A condition that should be satisfied. */
export type PredicateUpdateInput = {
  /** The condition type used by the predicate. */
  type?: InputMaybe<PredicateTypeEnum>;
  /** The condition value used by the predicate. */
  value?: InputMaybe<Scalars['String']>;
};

export enum ProvisionedByEnum {
  ApiCli = 'api_cli',
  ApiOther = 'api_other',
  ApiTerraform = 'api_terraform',
  IntegrationScim = 'integration_scim',
  SsoOkta = 'sso_okta',
  SsoOther = 'sso_other',
  Unknown = 'unknown',
  User = 'user'
}

/** The schema's entry-point for queries. */
export type Query = {
  __typename?: 'Query';
  /** Get information about the current account. */
  account: Account;
  /** OpsLevel's public IP addresses. */
  publicIpAddresses: Array<Scalars['String']>;
};

/** Return type for the `repositoriesUpdate` mutation. */
export type RepositoriesUpdatePayload = {
  __typename?: 'RepositoriesUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The repository objects that were not updated along with the error that happened when attempting to update the repository. */
  notUpdatedRepositories?: Maybe<Array<RepositoryOperationErrorPayload>>;
  /** The identifiers of the updated repositories. */
  updatedRepositories?: Maybe<Array<Repository>>;
};

/** A repository contains code that pertains to a service. */
export type Repository = {
  __typename?: 'Repository';
  /** Indicates if the repository is active. */
  active?: Maybe<Scalars['Boolean']>;
  /** The date the repository was archived. */
  archivedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** List of errors that occurred while syncing an opslevel.yml file. */
  configErrors: Array<ConfigError>;
  /** The date the repository was created. */
  createdOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** The default human-friendly identifier assigned to the repository. */
  defaultAlias?: Maybe<Scalars['String']>;
  /** The default branch from the repository's settings. */
  defaultBranch?: Maybe<Scalars['String']>;
  /** A url to the opslevel.defaults.yml file on the GitForge, assuming it's at the root. */
  defaultsConfigUrl: Scalars['String'];
  /** The tier that has been manually set for this repository. */
  definedTier?: Maybe<Tier>;
  /** A brief description of the repository. */
  description?: Maybe<Scalars['String']>;
  /** The display name in the format (organization/repo-name). */
  displayName: Scalars['String'];
  /** Indicates if the repository is forked. */
  forked?: Maybe<Scalars['Boolean']>;
  /** Does the tier of the repository match the required tier as determined by the highest service tier? */
  hasCorrectTier: Scalars['Boolean'];
  /** The tier of the most critical service that this repository supports. */
  highestServiceTier?: Maybe<Tier>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the repository. */
  id: Scalars['ID'];
  /** A list of languages used in the repository. */
  languages: Array<Language>;
  /** The date and time of the most recent ownership change. */
  lastOwnerChangedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** Indicates if the repository is locked by an opslevel.yml. */
  locked: Scalars['Boolean'];
  /** The name of the repository. */
  name: Scalars['String'];
  /** The organization to which the repository belongs to. */
  organization?: Maybe<Scalars['String']>;
  /** The team that owns the repository. */
  owner?: Maybe<Team>;
  /** The human-friendly identifier for the owning team (whether such a team exists or not). */
  ownerAlias?: Maybe<Scalars['String']>;
  /**
   * Indicates if the repository is private.
   * @deprecated Use visibility field instead.
   */
  private?: Maybe<Scalars['Boolean']>;
  /** The repository's unique key from its management platform. */
  repoKey: Scalars['String'];
  /** A url to the opslevel.yml file on the GitForge, assuming it's at the root. */
  rootConfigUrl: Scalars['String'];
  /** A list of services that are linked to the repository. */
  services?: Maybe<RepositoryServiceConnection>;
  /** A list of tags applied to the repository. */
  tags?: Maybe<TagRepositoryConnection>;
  /** The software tier that the repository belongs to. */
  tier?: Maybe<Tier>;
  /** The management platform of the repository. */
  type: Scalars['String'];
  /** The URL of the repository. */
  url?: Maybe<Scalars['String']>;
  /** The level of visibility of the repository. */
  visibility?: Maybe<RepositoryVisibilityEnum>;
  /** Indicates if the repository is visible. */
  visible?: Maybe<Scalars['Boolean']>;
};


/** A repository contains code that pertains to a service. */
export type RepositoryServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A repository contains code that pertains to a service. */
export type RepositoryTagsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** Specifies the input fields used to bulk update repositories. */
export type RepositoryBulkUpdateInput = {
  /** List of ids of the repository to be updated. */
  ids: Array<Scalars['ID']>;
  /** The team that owns the repository. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** Indicates if the repository is visible. */
  visible?: InputMaybe<Scalars['Boolean']>;
};

/** The return type of a `repositoryBulkUpdate` mutation. */
export type RepositoryBulkUpdatePayload = {
  __typename?: 'RepositoryBulkUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The list of repository object that could not be updated. */
  notUpdated?: Maybe<RepositoryConnection>;
  /** The number of unsuccessful operations. */
  notUpdatedCount?: Maybe<Scalars['Int']>;
  /** The number of successful operations. */
  successfulCount?: Maybe<Scalars['Int']>;
  /** List of ids of successful objects. */
  successfulIds?: Maybe<Array<Scalars['ID']>>;
};


/** The return type of a `repositoryBulkUpdate` mutation. */
export type RepositoryBulkUpdatePayloadNotUpdatedArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for Repository. */
export type RepositoryConnection = {
  __typename?: 'RepositoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<RepositoryEdge>>>;
  /** The number of hidden repositories. */
  hiddenCount: Scalars['Int'];
  /** The number of different git integrations. */
  integrationCount: Scalars['Int'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Repository>>>;
  /**
   * The number of different git integrations.
   * @deprecated Replaced by integration_count
   */
  organizationCount: Scalars['Int'];
  /** The number of owned repositories that are visible. */
  ownedCount: Scalars['Int'];
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
  /** The number of visible repositories. */
  visibleCount: Scalars['Int'];
};

/** An edge in a connection. */
export type RepositoryEdge = {
  __typename?: 'RepositoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Repository>;
};

export type RepositoryFileCheck = Check & {
  __typename?: 'RepositoryFileCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** Whether the check looks for the existence of a directory instead of a file. */
  directorySearch?: Maybe<Scalars['Boolean']>;
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** Condition to match the file content. */
  fileContentsPredicate?: Maybe<Predicate>;
  /** Restrict the search to certain file paths. */
  filePaths: Array<Scalars['String']>;
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
  /**
   * Whether the checks looks at the absolute root of a repo or the relative root
   * (the directory specified when attached a repo to a service).
   */
  useAbsoluteRoot?: Maybe<Scalars['Boolean']>;
};

/** Fields that can be used as part of filter for repositories. */
export enum RepositoryFilterEnum {
  /** Filter by the integration. */
  Integration = 'integration',
  /** Filter by `owner` field. */
  Owner = 'owner',
  /** Filter by repository visibility. */
  Visible = 'visible'
}

/** Input to be used to filter types. */
export type RepositoryFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: RepositoryFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

export type RepositoryGrepCheck = Check & {
  __typename?: 'RepositoryGrepCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** Whether the check looks for the existence of a directory instead of a file. */
  directorySearch: Scalars['Boolean'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** Condition to match the file content. */
  fileContentsPredicate: Predicate;
  /** Restrict the search to certain file paths. */
  filePaths: Array<Scalars['String']>;
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

export type RepositoryIntegratedCheck = Check & {
  __typename?: 'RepositoryIntegratedCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Specifies the repository and error after attempting and failing to perform a CRUD operation on a repository. */
export type RepositoryOperationErrorPayload = {
  __typename?: 'RepositoryOperationErrorPayload';
  /** The error message after an operation was attempted. */
  error?: Maybe<Scalars['String']>;
  /** The repository on which an operation was attempted. */
  repository: Repository;
};

/** The repository path used for this service. */
export type RepositoryPath = {
  __typename?: 'RepositoryPath';
  /** The deep link to the repository path where the linked service's code exists. */
  href: Scalars['String'];
  /** The path where the linked service's code exists, relative to the root of the repository. */
  path: Scalars['String'];
};

export type RepositorySearchCheck = Check & {
  __typename?: 'RepositorySearchCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** Condition to match the text content. */
  fileContentsPredicate: Predicate;
  /** Restrict the search to files of given extensions. */
  fileExtensions?: Maybe<Array<Scalars['String']>>;
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** The results of searching a repository. */
export type RepositorySearchResult = {
  __typename?: 'RepositorySearchResult';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The first file matching the search. */
  firstMatchPath?: Maybe<Scalars['String']>;
  /** Whether or not the predicate was true (ie: does_not_contain + no search results = passed: true). */
  passed?: Maybe<Scalars['Boolean']>;
};

/** The connection type for Service. */
export type RepositoryServiceConnection = {
  __typename?: 'RepositoryServiceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<RepositoryServiceEdge>>>;
  /** The paths where opslevel.ymls can be found for locked services. */
  lockedRepoPaths?: Maybe<Array<RepositoryPath>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Service>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type RepositoryServiceEdge = {
  __typename?: 'RepositoryServiceEdge';
  /** If any of the paths mapped to this service is a root path. */
  atRoot: Scalars['Boolean'];
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Service>;
  /** The repository paths used for this service. */
  paths: Array<RepositoryPath>;
  /** A list of service repositories that link the repository and this service. */
  serviceRepositories: Array<ServiceRepository>;
};

/** Sort possibilities for repositories. */
export enum RepositorySortEnum {
  /** Sort by `createdOn` ascending. */
  CreatedOnAsc = 'created_on_ASC',
  /** Sort by `createdOn` descending. */
  CreatedOnDesc = 'created_on_DESC',
  /** Sort by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Sort by `name` descending. */
  NameDesc = 'name_DESC',
  /** Sort by `organization` ascending. */
  OrganizationAsc = 'organization_ASC',
  /** Sort by `organization` descending. */
  OrganizationDesc = 'organization_DESC',
  /** Sort by `owner` ascending. */
  OwnerAsc = 'owner_ASC',
  /** Sort by `owner` descending. */
  OwnerDesc = 'owner_DESC'
}

/** Specifies the input fields used to update a repository. */
export type RepositoryUpdateInput = {
  /** The id of the repository to be updated. */
  id: Scalars['ID'];
  /** The team that owns the repository. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The index of software tier that the repository belongs to. */
  tierIndex?: InputMaybe<Scalars['Int']>;
  /** Indicates if the repository is visible. */
  visible?: InputMaybe<Scalars['Boolean']>;
};

/** The return type of a `repositoryUpdate` mutation. */
export type RepositoryUpdatePayload = {
  __typename?: 'RepositoryUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A repository contains code that pertains to a service. */
  repository?: Maybe<Repository>;
};

/** Possible visibility levels for repositories. */
export enum RepositoryVisibilityEnum {
  /** Repositories that are only accessible to organization users. */
  Internal = 'INTERNAL',
  /** Repositories that are private to the user. */
  Private = 'PRIVATE',
  /** Repositories that are publically accessible. */
  Public = 'PUBLIC'
}

/** The return type of the delete mutation. */
export type ResourceDeletePayload = {
  __typename?: 'ResourceDeletePayload';
  /** The alias of the deleted resource. */
  deletedAlias?: Maybe<Scalars['String']>;
  /** The id of the deleted resource. */
  deletedId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** The connection type for ResourceDocumentSource. */
export type ResourceDocumentConnection = {
  __typename?: 'ResourceDocumentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ResourceDocumentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<ResourceDocumentSource>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type ResourceDocumentEdge = {
  __typename?: 'ResourceDocumentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<ResourceDocumentSource>;
  status?: Maybe<ResourceDocumentStatusTypeEnum>;
};

/** The source of a document. */
export type ResourceDocumentSource = Service;

/** Status of a document on a resource. */
export enum ResourceDocumentStatusTypeEnum {
  /** Document is hidden */
  Hidden = 'hidden',
  /** Document is pinned */
  Pinned = 'pinned',
  /** Document is visible */
  Visible = 'visible'
}

/** Specifies the input fields used in the `resourceDocumentStatusUpdate` mutation. */
export type ResourceDocumentStatusUpdateInput = {
  /** The document id of the document portion of the ResourceDocument */
  documentId: Scalars['ID'];
  /** The resourece (currently on service) identifier for the resource portion of the ResourceDocument. */
  resource: IdentifierInput;
  /** The status to update for the ResourceDocument. */
  status: ResourceDocumentStatusTypeEnum;
};

/** Return type for the `resourceDocumentStatusUpdate` mutation. */
export type ResourceDocumentStatusUpdatePayload = {
  __typename?: 'ResourceDocumentStatusUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The updated status of a ResourceDocument. */
  updatedStatus?: Maybe<ResourceDocumentStatusTypeEnum>;
};

/** Rubrics allow you to score your services against different categories and levels. */
export type Rubric = {
  __typename?: 'Rubric';
  /** List all rubric categories for your account. */
  categories?: Maybe<CategoryConnection>;
  /** The checks of the rubric. */
  checks?: Maybe<CheckConnection>;
  /** The description of the rubric. */
  description?: Maybe<Scalars['String']>;
  /** The id of the rubric. */
  id: Scalars['ID'];
  /** List all rubric levels for your account. */
  levels: LevelConnection;
  /** The display name of the rubric. */
  name: Scalars['String'];
};


/** Rubrics allow you to score your services against different categories and levels. */
export type RubricCategoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** Rubrics allow you to score your services against different categories and levels. */
export type RubricChecksArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  categoryId?: InputMaybe<Scalars['ID']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** Rubrics allow you to score your services against different categories and levels. */
export type RubricLevelsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The check result information for the service's rubric. */
export type RubricReport = {
  __typename?: 'RubricReport';
  /** A category is used to group related checks in a rubric. */
  categories?: Maybe<ServiceCategoryConnection>;
  /** The level of a specific category. */
  categoryLevel?: Maybe<Level>;
  /** The service check results. */
  checkResults?: Maybe<ServiceCheckResults>;
  /** The overall level of the service. */
  level?: Maybe<Level>;
};


/** The check result information for the service's rubric. */
export type RubricReportCategoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** The check result information for the service's rubric. */
export type RubricReportCategoryLevelArgs = {
  categoryId?: InputMaybe<Scalars['ID']>;
};

/** Input to be used to update a rubric. */
export type RubricUpdateInput = {
  /** The description of the rubric. */
  description?: InputMaybe<Scalars['String']>;
  /** The ID of the rubric to be updated. */
  id: Scalars['ID'];
  /** The display name of the rubric. */
  name?: InputMaybe<Scalars['String']>;
};

/** The return type of a `rubricUpdate` mutation. */
export type RubricUpdatePayload = {
  __typename?: 'RubricUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Rubrics allow you to score your services against different categories and levels. */
  rubric?: Maybe<Rubric>;
};

/** An OpsLevel runner runs OpsLevel Runner Jobs. */
export type Runner = {
  __typename?: 'Runner';
  /** ID of the runner. */
  id: Scalars['ID'];
  /** The scope of the runner. */
  scope: RunnerScopeTypeEnum;
  /** The status of the runner. */
  status: RunnerStatusTypeEnum;
};

/** Specifies the input fields used to append a log chunk to a runnerJob's logs. */
export type RunnerAppendJobLogInput = {
  /** The contents of the log to append */
  logChunk: Array<Scalars['String']>;
  /** The runner id. */
  runnerId: Scalars['ID'];
  /** The job id. */
  runnerJobId: Scalars['ID'];
  /** The runner-specified timestamp that the log chunk was sent */
  sentAt: Scalars['ISO8601DateTime'];
};

/** Return type for the `runnerAppendJobLog` mutation. */
export type RunnerAppendJobLogPayload = {
  __typename?: 'RunnerAppendJobLogPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The runner job */
  runnerJob?: Maybe<RunnerJob>;
};

/** Return type for the `runnerGetPendingJob` mutation. */
export type RunnerGetPendingJobPayload = {
  __typename?: 'RunnerGetPendingJobPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /**
   * Token that represents the state of the queue the last time that particular
   * runner had requested a job. The runner client just needs to pass this same
   * value back in the next request to get a pending job.
   */
  lastUpdateToken?: Maybe<Scalars['ID']>;
  /** The job that can is assigned to the runner. */
  runnerJob?: Maybe<RunnerJob>;
};

/** The job that can be executed by a runner. */
export type RunnerJob = {
  __typename?: 'RunnerJob';
  /** The commands used when executing the job. */
  commands: Array<Scalars['String']>;
  /** An array of ad-hoc shell scripts to load in at runtime when executing the job. */
  files?: Maybe<Array<RunnerJobFile>>;
  /** The ID of the job. */
  id: Scalars['ID'];
  /** The image for the container that should be used to execute the job in. */
  image: Scalars['String'];
  /** The result status of the job. */
  outcome?: Maybe<RunnerJobOutcomeEnum>;
  /** The current status of the job. */
  status: RunnerJobStatusEnum;
  /** A set of variables to be used by the job during the execution. */
  variables?: Maybe<Array<RunnerJobVariable>>;
};

/** Represents a script to load in at runtime when running the parent RunnerJob */
export type RunnerJobFile = {
  __typename?: 'RunnerJobFile';
  /** The contents of the shell script, expressed as a single multi-line string */
  contents: Scalars['String'];
  /** The name of the script to be generated and made availble in the RunnerJob commands */
  name: Scalars['String'];
};

/** A series of received log chunks associated with a single job */
export type RunnerJobLog = {
  __typename?: 'RunnerJobLog';
  /** An array of logs received from the OpsLevel runner for a job run */
  logChunk: Array<Scalars['String']>;
  /** The timestamp that the log chunk was sent by the OpsLevel runner. */
  sentAt: Scalars['ISO8601DateTime'];
};

/** The runner job outcome. */
export enum RunnerJobOutcomeEnum {
  /** Job was blackholed and not allowed to run. */
  Blackholed = 'blackholed',
  /** Job was canceled. */
  Canceled = 'canceled',
  /** Job run took too long to complete, and was marked as failed. */
  ExecutionTimeout = 'execution_timeout',
  /** Job failed during execution. */
  Failed = 'failed',
  /** A pod could not be scheduled for the job in time. */
  PodTimeout = 'pod_timeout',
  /** Job was not assigned to a runner for too long. */
  QueueTimeout = 'queue_timeout',
  /** Job succeded the execution. */
  Success = 'success',
  /** Job was not started yet. */
  Unstarted = 'unstarted'
}

/** A outcome variable assigned by the job */
export type RunnerJobOutcomeVariable = {
  /** The name of the variable */
  key: Scalars['String'];
  /** The value of the variable */
  value: Scalars['String'];
};

/** The runner job status */
export enum RunnerJobStatusEnum {
  /** A finished runner job. */
  Complete = 'complete',
  /** A created runner job, but not yet ready to be run. */
  Created = 'created',
  /** A runner job ready to be run. */
  Pending = 'pending',
  /** A runner job being run by a runner. */
  Running = 'running'
}

/** A variable defined for use in a runner job. */
export type RunnerJobVariable = {
  __typename?: 'RunnerJobVariable';
  /** Variable key. */
  key: Scalars['String'];
  /** If the variable is sensitive or not. Sensitive variable values will be masked in log output. */
  sensitive: Scalars['Boolean'];
  /** Variable value. */
  value: Scalars['String'];
};

/** Return type for the RunnerRegister mutation. */
export type RunnerRegisterPayload = {
  __typename?: 'RunnerRegisterPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Details for the newly registered runner. */
  runner?: Maybe<Runner>;
};

/** Specifies the input fields used to report a runner job outcome. */
export type RunnerReportJobOutcomeInput = {
  /** The job outcome. */
  outcome: RunnerJobOutcomeEnum;
  /** Any specific variables assigned by the job process. */
  outcomeVariables?: InputMaybe<Array<RunnerJobOutcomeVariable>>;
  /** The runner id. */
  runnerId: Scalars['ID'];
  /** The job id. */
  runnerJobId: Scalars['ID'];
};

/** Return type for the `runnerReportJobOutcome` mutation. */
export type RunnerReportJobOutcomePayload = {
  __typename?: 'RunnerReportJobOutcomePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The job that can be executed by a runner. */
  runnerJob?: Maybe<RunnerJob>;
};

/** Recommended scale to run group of OpsLevel Runner pods. */
export type RunnerScale = {
  __typename?: 'RunnerScale';
  /** Recommended number of instances to run within group of OpsLevel Runner pods. */
  recommendedReplicaCount?: Maybe<Scalars['Int']>;
};

/** The account scope for an OpsLevel Runner. */
export enum RunnerScopeTypeEnum {
  /** Only runs OpsLevel Runner Jobs from the parent account. */
  AccountOwned = 'account_owned',
  /** Runs OpsLevel Runner Jobs from multiple accounts. */
  Shared = 'shared'
}

/** The status of an OpsLevel runner. */
export enum RunnerStatusTypeEnum {
  /** The runner will not actively take jobs. */
  Inactive = 'inactive',
  /** The runner will process jobs. */
  Registered = 'registered'
}

/** Return type for the RunnerUnregister mutation. */
export type RunnerUnregisterPayload = {
  __typename?: 'RunnerUnregisterPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Details for the unregistered runner. */
  runner?: Maybe<Runner>;
};

export type ScimIntegration = Integration & {
  __typename?: 'ScimIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A service represents software deployed in your production infrastructure. */
export type Service = {
  __typename?: 'Service';
  /** AlertSourceService connections. Edges between AlertSource and Service that contain the status. */
  alertSources?: Maybe<AlertSourceServiceConnection>;
  /** The status of the service based on the current alerts. */
  alertStatus: AlertStatus;
  /**
   * A human-friendly, unique identifier for the service.
   * @deprecated Alias is now deprecated. Please use `aliases` instead.
   */
  alias?: Maybe<Scalars['String']>;
  /** A list of human-friendly, unique identifiers for the service. */
  aliases: Array<Scalars['String']>;
  /**
   * The path, relative to the service repository's base directory, from which to
   * fetch the API document. If null, the API document is fetched from the path in
   * the account's apiDocsDefaultPath field.
   */
  apiDocumentPath?: Maybe<Scalars['String']>;
  /** Report of how the service is performing against associated campaigns. */
  campaignReport?: Maybe<CampaignReport>;
  /** A summary of check results on the service. */
  checkStats?: Maybe<CheckStats>;
  /** Information extracted from the opslevel.yml config as code. */
  config?: Maybe<ServiceConfig>;
  /** The path used for linking a repository to this service */
  createServiceRepositoryPath: Scalars['String'];
  /** The source that created this service. */
  creationSource?: Maybe<ServiceCreationSourceEnum>;
  /** Either the primary service repository, or the first valid non-archived repo, if any. */
  defaultServiceRepository?: Maybe<ServiceRepository>;
  /** The services that this service depends on. */
  dependencies?: Maybe<ServiceDependenciesConnection>;
  /** Whether this service is a dependency of the service whose id was provided. */
  dependencyOf: Scalars['Boolean'];
  /** The services that depend on this service. */
  dependents?: Maybe<ServiceDependentsConnection>;
  /** A brief description of the service. */
  description?: Maybe<Scalars['String']>;
  /** A list of aliases and their details. */
  detailedAliases: Array<Alias>;
  /** All documents attached to this service. */
  documents: ServiceDocumentConnection;
  /** The external issues that are associated with the service. */
  externalIssues?: Maybe<Array<ExternalIssue>>;
  /** The service's external UUID. */
  externalUuid?: Maybe<Scalars['String']>;
  /** The primary software development framework that the service uses. */
  framework?: Maybe<Scalars['String']>;
  /** Whether or not the service has alert sources configured */
  hasAlertSources: Scalars['Boolean'];
  /** Whether the opslevel.yml for the service has an error or not */
  hasServiceConfigError: Scalars['Boolean'];
  /**
   * A health report on the service.
   * @deprecated Please use `maturity_report` instead.
   */
  healthReport?: Maybe<ServiceMaturityReport>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the service. */
  id: Scalars['ID'];
  /** The primary programming language that the service is written in. */
  language?: Maybe<Scalars['String']>;
  /** The most recent `Deploy` for this service. */
  lastDeploy?: Maybe<Deploy>;
  /** The index of the service's overall level */
  levelIndex?: Maybe<Scalars['Int']>;
  /** The lifecycle stage of the service. */
  lifecycle?: Maybe<Lifecycle>;
  /** Whether the service can be linked to a repository. */
  linkable: Scalars['Boolean'];
  /** Indicates if the service is locked by an opslevel.yml. */
  locked: Scalars['Boolean'];
  /** The number of dependencies of the service that have a lower tier. */
  lowerTierDependencyCount: Scalars['Int'];
  /** A health report on the service. */
  maturityReport?: Maybe<ServiceMaturityReport>;
  /** The display name of the service. */
  name: Scalars['String'];
  /** Additional information about the service. */
  note?: Maybe<Scalars['String']>;
  /** The list of users on call for this service */
  onCalls?: Maybe<OnCallConnection>;
  /** The team that owns the service. */
  owner?: Maybe<Team>;
  /** The API document selected for display on the API docs tab on the service's page. */
  preferredApiDocument?: Maybe<ServiceDocument>;
  /**
   * The API document source (push or pull) used to determine the preferred API
   * document. If null, we try the pushed doc and then the pulled doc (in that order).
   */
  preferredApiDocumentSource?: Maybe<ApiDocumentSourceEnum>;
  /**
   * A product is an application that your end user interacts with. Multiple
   * services can work together to power a single product.
   */
  product?: Maybe<Scalars['String']>;
  /** The raw unsanitized additional information about the service. */
  rawNote?: Maybe<Scalars['String']>;
  /** A list of repositories that are linked to the service. */
  repos?: Maybe<ServiceRepositoryConnection>;
  /**
   * A list of repositories that are linked to the service.
   * @deprecated `repositories` is now deprecated. Please use `repos` instead.
   */
  repositories?: Maybe<RepositoryConnection>;
  /** A summary of check results on the service. */
  serviceStats?: Maybe<ServiceStats>;
  /** The ServiceTemplateRun instance that generated this service if it was created from a service template. */
  serviceTemplateRun?: Maybe<ServiceTemplateRun>;
  /** A list of tags applied to the service. */
  tags?: Maybe<TagConnection>;
  /** The software tier that the service belongs to. */
  tier?: Maybe<Tier>;
  /** Relevant timestamps. */
  timestamps: Timestamps;
  /** A list of tools that are used by the service. */
  tools?: Maybe<ToolConnection>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceAlertSourcesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<AlertSourceSortEnum>;
  withOnCall?: InputMaybe<Scalars['Boolean']>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceCampaignReportArgs = {
  campaignIds?: InputMaybe<Array<Scalars['ID']>>;
  connective?: InputMaybe<ConnectiveEnum>;
  filter?: InputMaybe<Array<CampaignFilterInput>>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceDependenciesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<ServiceFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceDependencyOfArgs = {
  serviceId: Scalars['ID'];
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceDependentsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  filter?: InputMaybe<Array<ServiceFilterInput>>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceDocumentsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  hidden?: InputMaybe<Scalars['Boolean']>;
  last?: InputMaybe<Scalars['Int']>;
  searchTerm?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<DocumentTypeEnum>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceOnCallsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<OnCallSortEnum>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceReposArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceTagsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A service represents software deployed in your production infrastructure. */
export type ServiceToolsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  bestProdEnv?: InputMaybe<Scalars['Boolean']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for Category. */
export type ServiceCategoryConnection = {
  __typename?: 'ServiceCategoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceCategoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Category>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type ServiceCategoryEdge = {
  __typename?: 'ServiceCategoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The level of the service category. */
  level?: Maybe<Level>;
  /** The item at the end of the edge. */
  node?: Maybe<Category>;
};

/** The service check results. */
export type ServiceCheckResults = {
  __typename?: 'ServiceCheckResults';
  /** The list of service check results grouped by level. */
  byLevel?: Maybe<CheckResultsByLevelConnection>;
};


/** The service check results. */
export type ServiceCheckResultsByLevelArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** Extracted fields from opslevel.yml. */
export type ServiceConfig = {
  __typename?: 'ServiceConfig';
  /** Extracted information about the lifecycle */
  lifecycle?: Maybe<Slug>;
  /** Extracted information about the owner. */
  owner?: Maybe<Slug>;
  /** Extracted information about the tier */
  tier?: Maybe<Slug>;
};

export type ServiceConfigurationCheck = Check & {
  __typename?: 'ServiceConfigurationCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** The connection type for Service. */
export type ServiceConnection = {
  __typename?: 'ServiceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceEdge>>>;
  /** The number of returned nodes */
  filteredCount?: Maybe<Scalars['Int']>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Service>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Object containing the predicates for filtering services. */
  predicates?: Maybe<Scalars['JSON']>;
  /** The total number of services. */
  totalCount?: Maybe<Scalars['Int']>;
};

/** Specifies the input fields used in the `serviceCreate` mutation. */
export type ServiceCreateInput = {
  /** A brief description of the service. */
  description?: InputMaybe<Scalars['String']>;
  /** The primary software development framework that the service uses. */
  framework?: InputMaybe<Scalars['String']>;
  /** The primary programming language that the service is written in. */
  language?: InputMaybe<Scalars['String']>;
  /** The lifecycle stage of the service. */
  lifecycleAlias?: InputMaybe<Scalars['String']>;
  /** The display name of the service. */
  name: Scalars['String'];
  /** The team that owns the service. */
  ownerAlias?: InputMaybe<Scalars['String']>;
  /** The parent system for the service. */
  parent?: InputMaybe<IdentifierInput>;
  /**
   * A product is an application that your end user interacts with. Multiple
   * services can work together to power a single product.
   */
  product?: InputMaybe<Scalars['String']>;
  /** A list of repositories that are linked to the service. */
  repositories?: InputMaybe<Array<Scalars['ID']>>;
  /** Allows for the creation of a service with invalid aliases. */
  skipAliasesValidation?: InputMaybe<Scalars['Boolean']>;
  /** The software tier that the service belongs to. */
  tierAlias?: InputMaybe<Scalars['String']>;
};

/** Return type for the `serviceCreate` mutation. */
export type ServiceCreatePayload = {
  __typename?: 'ServiceCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly created service. */
  service?: Maybe<Service>;
};

/** Types of sources from which Services can be created. */
export enum ServiceCreationSourceEnum {
  /** Service created by OpsLevel. */
  RepositoryAnalysis = 'repository_analysis'
}

/** Specifies the input fields used in the `serviceDelete` mutation. */
export type ServiceDeleteInput = {
  /** The alias of the service to be deleted. */
  alias?: InputMaybe<Scalars['String']>;
  /** The id of the service to be deleted. */
  id?: InputMaybe<Scalars['ID']>;
};

/** Return type for the `serviceDelete` mutation. */
export type ServiceDeletePayload = {
  __typename?: 'ServiceDeletePayload';
  /** The alias of the deleted service. */
  deletedServiceAlias?: Maybe<Scalars['String']>;
  /** The ID of the deleted service. */
  deletedServiceId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used in the `serviceDependenciesAssign` mutation. */
export type ServiceDependenciesAssignInput = {
  /** A collection of dependency input objects identifying the dependencies to be created. */
  edgeInputs: Array<ServiceDependencyCreateInput>;
};

/** Return type for the `serviceDependenciesCreate` mutation. */
export type ServiceDependenciesAssignPayload = {
  __typename?: 'ServiceDependenciesAssignPayload';
  /** A collection of source, destination pairs identifying the dependencies that were successfully deleted. */
  assignedDependencies?: Maybe<Array<ServiceDependency>>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A collection of source, destination pairs identifying the dependencies that were successfully deleted. */
  skippedDependencies?: Maybe<Array<ServiceDependencyEdgePayload>>;
};

/** The connection type for Service. */
export type ServiceDependenciesConnection = {
  __typename?: 'ServiceDependenciesConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceDependenciesEdge>>>;
  /** The number of returned nodes */
  filteredCount?: Maybe<Scalars['Int']>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Service>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of services. */
  totalCount?: Maybe<Scalars['Int']>;
};

/** Specifies the input fields used in the `serviceDependenciesDelete` mutation. */
export type ServiceDependenciesDeleteInput = {
  /** A collection of source, destination pairs identifying the dependencies to be deleted. */
  dependencyKeys: Array<ServiceDependencyKey>;
};

/** Return type for the `serviceDependenciesDelete` mutation. */
export type ServiceDependenciesDeletePayload = {
  __typename?: 'ServiceDependenciesDeletePayload';
  /** A collection of source, destination pairs identifying the dependencies that were successfully deleted. */
  deletedKeys?: Maybe<Array<ServiceDependencyKeyPayload>>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type ServiceDependenciesEdge = {
  __typename?: 'ServiceDependenciesEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The id representing the service dependency. */
  id: Scalars['ID'];
  /** Is the dependency locked by a service config? */
  locked: Scalars['Boolean'];
  /** The url to the opslevel.yml file that specifies this dependency. */
  lockerUrl?: Maybe<Scalars['String']>;
  /** The item at the end of the edge. */
  node?: Maybe<Service>;
  /** Notes for service dependency. */
  notes?: Maybe<Scalars['String']>;
};

/** A service dependancy edge. */
export type ServiceDependency = {
  __typename?: 'ServiceDependency';
  /** The service that was depended upon. */
  destinationService: Service;
  /** ID of the serivde dependency edge. */
  id: Scalars['ID'];
  /** Notes about the dependency edge. */
  notes?: Maybe<Scalars['String']>;
  /** The service that had the dependency. */
  sourceService: Service;
};

export type ServiceDependencyCheck = Check & {
  __typename?: 'ServiceDependencyCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Specifies the input fields used for creating a service dependency. */
export type ServiceDependencyCreateInput = {
  /** A source, destination pair specifying a dependency between services. */
  dependencyKey: ServiceDependencyKey;
  /** Notes for service dependency. */
  notes?: InputMaybe<Scalars['String']>;
};

/** Return type for raw dependency edges. */
export type ServiceDependencyEdgePayload = {
  __typename?: 'ServiceDependencyEdgePayload';
  /** The Service ID for the destination node. */
  destination?: Maybe<Scalars['String']>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The Service ID for the source node. */
  source?: Maybe<Scalars['String']>;
};

/** A source, destination pair specifying a dependency between services. */
export type ServiceDependencyKey = {
  /** The ID or alias identifier of the service that is depended upon. */
  destinationIdentifier?: InputMaybe<IdentifierInput>;
  /** The ID or alias identifier of the service with the dependency. */
  sourceIdentifier?: InputMaybe<IdentifierInput>;
};

/** translation missing: en.graphql.types.service_dependency_key_payload.self */
export type ServiceDependencyKeyPayload = {
  __typename?: 'ServiceDependencyKeyPayload';
  /** translation missing: en.graphql.types.service_dependency_key_payload.destination */
  destination: Scalars['ID'];
  /** translation missing: en.graphql.types.service_dependency_key_payload.source */
  source: Scalars['ID'];
};

/** Return type for the requested `serviceDependency`. */
export type ServiceDependencyPayload = {
  __typename?: 'ServiceDependencyPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A service dependancy edge. */
  serviceDependency?: Maybe<ServiceDependency>;
};

/** The connection type for Service. */
export type ServiceDependentsConnection = {
  __typename?: 'ServiceDependentsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceDependentsEdge>>>;
  /** The number of returned nodes */
  filteredCount?: Maybe<Scalars['Int']>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Service>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of services. */
  totalCount?: Maybe<Scalars['Int']>;
};

/** An edge in a connection. */
export type ServiceDependentsEdge = {
  __typename?: 'ServiceDependentsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The id representing the service dependency. */
  id: Scalars['ID'];
  /** Is the dependency locked by a service config? */
  locked: Scalars['Boolean'];
  /** The url to the opslevel.yml file that specifies this dependency. */
  lockerUrl?: Maybe<Scalars['String']>;
  /** The item at the end of the edge. */
  node?: Maybe<Service>;
  /** Notes for service dependency. */
  notes?: Maybe<Scalars['String']>;
};

/** A document that is attached to resource(s) in OpsLevel. */
export type ServiceDocument = {
  __typename?: 'ServiceDocument';
  /** The list of resources that are attached to this document */
  attachedResources?: Maybe<ResourceDocumentConnection>;
  /** The contents of the document. */
  content?: Maybe<Scalars['String']>;
  /** The file extension of the document, e.g. 'json'. */
  fileExtension?: Maybe<Scalars['String']>;
  /** The URL of the document, if any. */
  htmlUrl?: Maybe<Scalars['String']>;
  /** The ID of the Document. */
  id: Scalars['ID'];
  /** Metadata about the document. */
  metadata?: Maybe<Scalars['JSON']>;
  /** The path to the file in the repository (only available when the source is a Repository or ServiceRepository). */
  pathInRepository?: Maybe<Scalars['String']>;
  /** The source of the document. */
  source: ServiceDocumentSource;
  /** When the document was created and updated. */
  timestamps: Timestamps;
  /** The title of the document. */
  title: Scalars['String'];
  /** The type of the document. */
  type: DocumentTypeEnum;
};


/** A document that is attached to resource(s) in OpsLevel. */
export type ServiceDocumentAttachedResourcesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  hidden?: InputMaybe<Scalars['Boolean']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for ServiceDocument. */
export type ServiceDocumentConnection = {
  __typename?: 'ServiceDocumentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceDocumentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<ServiceDocument>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type ServiceDocumentEdge = {
  __typename?: 'ServiceDocumentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<ServiceDocument>;
  status?: Maybe<ResourceDocumentStatusTypeEnum>;
};

/** The source of a document. */
export type ServiceDocumentSource = ApiDocIntegration | Repository | ServiceRepository;

/** An edge in a connection. */
export type ServiceEdge = {
  __typename?: 'ServiceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** A hash of the fields and their associated highlights from a service query. */
  highlights?: Maybe<Scalars['JSON']>;
  /** The item at the end of the edge. */
  node?: Maybe<Service>;
};

/** Fields that can be used as part of filter for services. */
export enum ServiceFilterEnum {
  /** Filter by `alert status` field */
  AlertStatus = 'alert_status',
  /** Filter by the creation source. */
  CreationSource = 'creation_source',
  /** Filter by Domain that includes the System this service is assigned to, if any. */
  DomainId = 'domain_id',
  /** Filter by `framework` field */
  Framework = 'framework',
  /** Filter by group hierarchy. Will return resources who's owner is in the group ancestry chain. */
  GroupIds = 'group_ids',
  /** Filter by `language` field */
  Language = 'language',
  /** Filter by `level` field */
  LevelIndex = 'level_index',
  /** Filter by `lifecycle` field */
  LifecycleIndex = 'lifecycle_index',
  /** Filter by `name` field */
  Name = 'name',
  /** Filter by `owner` field */
  OwnerId = 'owner_id',
  /** Filter by `product` field */
  Product = 'product',
  /** Filter by System that this service is assigned to, if any. */
  SystemId = 'system_id',
  /** Filter by `tag` field */
  Tag = 'tag',
  /** Filter by `tier` field */
  TierIndex = 'tier_index'
}

/** Input to be used to filter types. */
export type ServiceFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** The logical operator to be used in conjunction with multiple filters (requires predicates to be supplied). */
  connective?: InputMaybe<ConnectiveEnum>;
  /** Field to be filtered. */
  key?: InputMaybe<ServiceFilterEnum>;
  /** A list of service filter input. */
  predicates?: InputMaybe<Array<ServiceFilterInput>>;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<TypeEnum>;
};

/** Inputs to specify details of template to use when creating a new service, and also metadata about the service being created. */
export type ServiceFromTemplateCreateInput = {
  /** The primary software development framework of the service being created. */
  framework?: InputMaybe<Scalars['String']>;
  /** ID of the git forge integration that will host the new repository. */
  integrationId?: InputMaybe<Scalars['ID']>;
  /** The programming language of the service being created. */
  language?: InputMaybe<Scalars['String']>;
  /** ID of team that owns the service being created. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** Name of the created repository. */
  repositoryName?: InputMaybe<Scalars['String']>;
  /** The description of the service being created. */
  serviceDescription?: InputMaybe<Scalars['String']>;
  /** The name to to use to represent the service within OpsLevel after it has been succesfully generated. */
  serviceName: Scalars['String'];
  /** List of input values for the template's variables. */
  serviceTemplateVariableValues: Array<ServiceTemplateVariableValueInput>;
  /** The commit SHA of the template repo representing the version of the template to use. */
  templateRepoCommit: Scalars['String'];
  /** URL to template config file (usually 'cookiecutter.json') in the repo containing the service template. */
  templateRepoUrl: Scalars['String'];
};

/** translation missing: en.graphql.types.service_from_template_create_payload.self */
export type ServiceFromTemplateCreatePayload = {
  __typename?: 'ServiceFromTemplateCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Represents the use of a service template with a particular set of inputs to generate a new service. */
  serviceTemplateRun?: Maybe<ServiceTemplateRun>;
};

/** The health report for this service in terms of its levels and checks. */
export type ServiceMaturityReport = {
  __typename?: 'ServiceMaturityReport';
  /** The level of each category for this service. */
  categoryBreakdown: Array<CategoryLevel>;
  /** The latest check results for this service across the given checks. */
  latestCheckResults?: Maybe<Array<CheckResult>>;
  /** The overall level for this service. */
  overallLevel: Level;
};


/** The health report for this service in terms of its levels and checks. */
export type ServiceMaturityReportLatestCheckResultsArgs = {
  ids: Array<Scalars['ID']>;
};

/** Specifies the input fields used in the `serviceNoteUpdate` mutation. */
export type ServiceNoteUpdateInput = {
  /** Note about the service. */
  note?: InputMaybe<Scalars['String']>;
  /** The identifier for the service. */
  service: IdentifierInput;
};

/** Return type for the `serviceNoteUpdate` mutation. */
export type ServiceNoteUpdatePayload = {
  __typename?: 'ServiceNoteUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A service represents software deployed in your production infrastructure. */
  service?: Maybe<Service>;
};

/** Specifies the service and error after attempting and failing to perform a CRUD operation on a service. */
export type ServiceOperationErrorPayload = {
  __typename?: 'ServiceOperationErrorPayload';
  /** The error message after an operation was attempted. */
  error?: Maybe<Scalars['String']>;
  /** The service on which an operation was attempted. */
  service: Service;
};

export type ServiceOwnershipCheck = Check & {
  __typename?: 'ServiceOwnershipCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** The type of contact method that an owner should provide */
  contactMethod?: Maybe<Scalars['String']>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Whether to require a contact method for a service owner or not */
  requireContactMethod: Scalars['Boolean'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The tag key that should exist for a service owner. */
  tagKey?: Maybe<Scalars['String']>;
  /** The condition that should be satisfied by the tag value. */
  tagPredicate?: Maybe<Predicate>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

export type ServicePropertyCheck = Check & {
  __typename?: 'ServicePropertyCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The property of the service that the check will verify. */
  propertyValuePredicate?: Maybe<Predicate>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** The condition that should be satisfied by the service property value. */
  serviceProperty: ServicePropertyTypeEnum;
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Properties of services that can be validated. */
export enum ServicePropertyTypeEnum {
  /** The description of a service. */
  Description = 'description',
  /** The primary software development framework of a service. */
  Framework = 'framework',
  /** The primary programming language of a service. */
  Language = 'language',
  /** The index of the lifecycle a service belongs to. */
  LifecycleIndex = 'lifecycle_index',
  /** The name of a service. */
  Name = 'name',
  /** Additional information about the service. */
  Note = 'note',
  /** The product that is associated with a service. */
  Product = 'product',
  /** The index of the tier a service belongs to. */
  TierIndex = 'tier_index'
}

/** A record of the connection between a service and a repository. */
export type ServiceRepository = {
  __typename?: 'ServiceRepository';
  /** The directory in the repository containing opslevel.yml. */
  baseDirectory?: Maybe<Scalars['String']>;
  /** The name displayed in the UI for the service repository. */
  displayName?: Maybe<Scalars['String']>;
  /** ID of the service repository. */
  id: Scalars['ID'];
  /** The repository that is part of this connection. */
  repository: Repository;
  /** The service that is part of this connection. */
  service: Service;
};

/** The connection type for Repository. */
export type ServiceRepositoryConnection = {
  __typename?: 'ServiceRepositoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceRepositoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Repository>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used in the `serviceRepositoryCreate` mutation. */
export type ServiceRepositoryCreateInput = {
  /** The directory in the repository containing opslevel.yml. */
  baseDirectory?: InputMaybe<Scalars['String']>;
  /** The name displayed in the UI for the service repository. */
  displayName?: InputMaybe<Scalars['String']>;
  /** The identifier for the repository. */
  repository: IdentifierInput;
  /** The identifier for the service. */
  service: IdentifierInput;
};

/** Return type for the `serviceRepositoryCreate` mutation. */
export type ServiceRepositoryCreatePayload = {
  __typename?: 'ServiceRepositoryCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A record of the connection between a service and a repository. */
  serviceRepository?: Maybe<ServiceRepository>;
};

/** An edge in a connection. */
export type ServiceRepositoryEdge = {
  __typename?: 'ServiceRepositoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Repository>;
  /** A list of service repositories that link the service and this repository. */
  serviceRepositories: Array<ServiceRepository>;
};

/** Specifies the input fields used to update a service repository. */
export type ServiceRepositoryUpdateInput = {
  /** The directory in the repository containing opslevel.yml. */
  baseDirectory?: InputMaybe<Scalars['String']>;
  /** The name displayed in the UI for the service repository. */
  displayName?: InputMaybe<Scalars['String']>;
  /** The ID of the service repository to be updated. */
  id: Scalars['ID'];
};

/** The return type of the `serviceRepositoryUpdate` mutation. */
export type ServiceRepositoryUpdatePayload = {
  __typename?: 'ServiceRepositoryUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The updated service repository. */
  serviceRepository?: Maybe<ServiceRepository>;
};

/** Sort possibilities for services. */
export enum ServiceSortEnum {
  /** Sort by alert status ascending. */
  AlertStatusAsc = 'alert_status_ASC',
  /** Sort by alert status descending. */
  AlertStatusDesc = 'alert_status_DESC',
  /** Sort by `checks_passing` ascending. */
  ChecksPassingAsc = 'checks_passing_ASC',
  /** Sort by `checks_passing` descending. */
  ChecksPassingDesc = 'checks_passing_DESC',
  /** Sort by last deploy time ascending. */
  LastDeployAsc = 'last_deploy_ASC',
  /** Sort by last deploy time descending. */
  LastDeployDesc = 'last_deploy_DESC',
  /** Sort by level ascending. */
  LevelIndexAsc = 'level_index_ASC',
  /** Sort by level descending. */
  LevelIndexDesc = 'level_index_DESC',
  /** Sort by lifecycle ascending. */
  LifecycleAsc = 'lifecycle_ASC',
  /** Sort by lifecycle descending. */
  LifecycleDesc = 'lifecycle_DESC',
  /** Sort by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Sort by `name` descending. */
  NameDesc = 'name_DESC',
  /** Sort by `owner` ascending. */
  OwnerAsc = 'owner_ASC',
  /** Sort by `owner` descending. */
  OwnerDesc = 'owner_DESC',
  /** Sort by `product` ascending. */
  ProductAsc = 'product_ASC',
  /** Sort by `product` descending. */
  ProductDesc = 'product_DESC',
  /** Alias to sort by `checks_passing` ascending. */
  ServiceStatAsc = 'service_stat_ASC',
  /** Alias to sort by `checks_passing` descending. */
  ServiceStatDesc = 'service_stat_DESC',
  /** Sort by `tier` ascending. */
  TierAsc = 'tier_ASC',
  /** Sort by `tier` descending. */
  TierDesc = 'tier_DESC'
}

/** The summary of check results for this service. */
export type ServiceStats = {
  __typename?: 'ServiceStats';
  /** The check result information for the service's rubric. */
  rubric: RubricReport;
};

/** Represents a service template with a particular set of inputs to generate a new service. */
export type ServiceTemplate = {
  __typename?: 'ServiceTemplate';
  /** The description of the service template. */
  description?: Maybe<Scalars['String']>;
  /** The primary software development framework that the service template uses. */
  framework?: Maybe<Scalars['String']>;
  /** The ID for this service template. */
  id: Scalars['ID'];
  /** The primary programming language that the service template is written in. */
  language?: Maybe<Scalars['String']>;
  /** The name for this service template. */
  name?: Maybe<Scalars['String']>;
  /** The owner of the service template. */
  owner?: Maybe<ServiceTemplateOwner>;
  /** The commit SHA of the template repo representing the version of the template to use. */
  templateRepoCommit?: Maybe<Scalars['String']>;
  /** URL to template config file in the repo containing the service template. */
  templateRepoUrl: Scalars['String'];
  /** When the service template was created and updated. */
  timestamps: Timestamps;
  /** Service template variables list. */
  variables?: Maybe<Array<ServiceTemplateVariable>>;
};

/** The connection type for ServiceTemplate. */
export type ServiceTemplateConnection = {
  __typename?: 'ServiceTemplateConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ServiceTemplateEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<ServiceTemplate>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Inputs to specify details of template to use when creating a new service. */
export type ServiceTemplateCreateInput = {
  /** The description of the service template. */
  description?: InputMaybe<Scalars['String']>;
  /** The primary software development framework that the service template uses. */
  framework?: InputMaybe<Scalars['String']>;
  /** The primary programming language that the service template is written in. */
  language?: InputMaybe<Scalars['String']>;
  /** The name of the service template */
  name?: InputMaybe<Scalars['String']>;
  /** ID of the owner of the service template being created. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** URL to template config file (usually 'cookiecutter.json') in the repo containing the service template. */
  templateRepoUrl: Scalars['String'];
};

/** Return type for the `serviceTemplateCreate` mutation. */
export type ServiceTemplateCreatePayload = {
  __typename?: 'ServiceTemplateCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Represents a service template with a particular set of inputs to generate a new service. */
  serviceTemplate?: Maybe<ServiceTemplate>;
};

/** An edge in a connection. */
export type ServiceTemplateEdge = {
  __typename?: 'ServiceTemplateEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<ServiceTemplate>;
};

/** The owner a service template can belong to. */
export type ServiceTemplateOwner = Team | User;

/** Represents the use of a service template with a particular set of inputs to generate a new service. */
export type ServiceTemplateRun = {
  __typename?: 'ServiceTemplateRun';
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** The ID for this ServiceTemplateRun. */
  id: Scalars['ID'];
  /** Logs associated with this service template run. */
  logs: Array<RunnerJobLog>;
  /** URL of the merge request to initialize the service repository. */
  mergeRequestUrl?: Maybe<Scalars['String']>;
  /** The outcome of the job that was part of this ServiceTemplateRun */
  outcome: RunnerJobOutcomeEnum;
  /** The outcome artifact that was created as the result of this ServiceTemplateRun. */
  outcomeArtifact?: Maybe<Artifact>;
  /** URL to associated git forge repository. */
  repoUrl?: Maybe<Scalars['String']>;
  /** The repository created and associated with the service. */
  repository?: Maybe<Repository>;
  /** The service that was created as a result of this ServiceTemplateRun. */
  service?: Maybe<Service>;
  /** The name for the newly-generated service */
  serviceName: Scalars['String'];
  /** List of input values for the template's variables. */
  serviceTemplateVariableValues?: Maybe<Array<ServiceTemplateVariableValue>>;
  /** Status of running this template with the provided inputs to generate a new service's files. */
  status?: Maybe<ServiceTemplateRunStatusEnum>;
  /** The commit SHA of the template repo representing the version of the template to use. */
  templateRepoCommit: Scalars['String'];
  /** URL to template config file in the repo containing the service template. */
  templateRepoUrl: Scalars['String'];
};

/** The status of the ServiceTemplateRun attempt. */
export enum ServiceTemplateRunStatusEnum {
  /** The ServiceTemplateRun attempt failed in creating a new service from the service template. */
  Failed = 'failed',
  /** The ServiceTemplateRun is currently running. */
  InProgress = 'in_progress',
  /** The ServiceTemplateRun attempt succeeded in creating a new service from the service template. */
  Success = 'success',
  /** The ServiceTemplateRun to create the new service has not started yet. */
  Unstarted = 'unstarted'
}

/** Inputs to specify new value to update a service template. */
export type ServiceTemplateUpdateInput = {
  /** The description of the service template. */
  description?: InputMaybe<Scalars['String']>;
  /** The primary software development framework that the service template uses. */
  framework?: InputMaybe<Scalars['String']>;
  /** ID of the service template to update. */
  id: Scalars['ID'];
  /** The primary programming language that the service template is written in. */
  language?: InputMaybe<Scalars['String']>;
  /** The new name of the service template. */
  name?: InputMaybe<Scalars['String']>;
  /** ID of the owner of the service template. */
  ownerId?: InputMaybe<Scalars['ID']>;
};

/** Return type for the `serviceTemplateUpdate` mutation. */
export type ServiceTemplateUpdatePayload = {
  __typename?: 'ServiceTemplateUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Represents a service template with a particular set of inputs to generate a new service. */
  serviceTemplate?: Maybe<ServiceTemplate>;
};

/** A variable to be used in the service template. */
export type ServiceTemplateVariable = {
  __typename?: 'ServiceTemplateVariable';
  /** Default value */
  defaultValue?: Maybe<Scalars['String']>;
  /** Name */
  name: Scalars['String'];
  /** Options for select */
  options?: Maybe<Array<Scalars['String']>>;
};

/** The name and value for a service template's variable. */
export type ServiceTemplateVariableValue = {
  __typename?: 'ServiceTemplateVariableValue';
  /** The name of the service template variable. */
  name: Scalars['String'];
  /** The value for the named service template variable. */
  value: Scalars['String'];
};

/** Value of template variable to use in generating a service from a template. */
export type ServiceTemplateVariableValueInput = {
  /** The name of the service template variable. */
  name: Scalars['String'];
  /** The value for the named service template variable. */
  value: Scalars['String'];
};

/** The set of service template variables and it's metadata. */
export type ServiceTemplateVariables = {
  __typename?: 'ServiceTemplateVariables';
  /** Service template commit hash. */
  templateRepoCommit: Scalars['String'];
  /** Service template URL. */
  templateRepoUrl: Scalars['String'];
  /** Service template variables list. */
  variables: Array<ServiceTemplateVariable>;
};

/** Specifies the input fields used in the `serviceTemplateVariablesParse` mutation. */
export type ServiceTemplateVariablesParseInput = {
  url: Scalars['String'];
};

/** The return type of the `serviceTemplateVariablesParse` mutation. */
export type ServiceTemplateVariablesParsePayload = {
  __typename?: 'ServiceTemplateVariablesParsePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The set of service template variables and it's metadata. */
  serviceTemplateVariables?: Maybe<ServiceTemplateVariables>;
};

/** Specifies the input fields used in the `serviceUpdate` mutation. */
export type ServiceUpdateInput = {
  /** The alias of the service to be updated. */
  alias?: InputMaybe<Scalars['String']>;
  /** A brief description of the service. */
  description?: InputMaybe<Scalars['String']>;
  /** The primary software development framework that the service uses. */
  framework?: InputMaybe<Scalars['String']>;
  /** The id of the service to be updated. */
  id?: InputMaybe<Scalars['ID']>;
  /** The primary programming language that the service is written in. */
  language?: InputMaybe<Scalars['String']>;
  /** The lifecycle stage of the service. */
  lifecycleAlias?: InputMaybe<Scalars['String']>;
  /** The display name of the service. */
  name?: InputMaybe<Scalars['String']>;
  /** The team that owns the service. */
  ownerAlias?: InputMaybe<Scalars['String']>;
  /** The parent system for the service. */
  parent?: InputMaybe<IdentifierInput>;
  /**
   * A product is an application that your end user interacts with. Multiple
   * services can work together to power a single product.
   */
  product?: InputMaybe<Scalars['String']>;
  /** Allows updating a service with invalid aliases. */
  skipAliasesValidation?: InputMaybe<Scalars['Boolean']>;
  /** The software tier that the service belongs to. */
  tierAlias?: InputMaybe<Scalars['String']>;
};

/** Return type for the `serviceUpdate` mutation. */
export type ServiceUpdatePayload = {
  __typename?: 'ServiceUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The updated service. */
  service?: Maybe<Service>;
};

/** Return type for the `servicesDelete` mutation. */
export type ServicesDeletePayload = {
  __typename?: 'ServicesDeletePayload';
  /** The identifiers of the deleted services. */
  deletedServices?: Maybe<Array<IdentifierPayload>>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The services objects that were not deleted along with the error that happened when attempting to delete the service. */
  notDeletedServices?: Maybe<Array<ServiceOperationErrorPayload>>;
};

/** Services Report contains aggregate data used in reports. */
export type ServicesReport = {
  __typename?: 'ServicesReport';
  /** The counts of how many services are in each category with a certain level. */
  categoryLevelCounts: Array<CategoryLevelCount>;
  /** The counts of many services are in each level. */
  levelCounts: Array<LevelCount>;
  /** The count of how many services do not have an assigned level. */
  totalServicesNotEvaluated: Scalars['Int'];
};

/** Return type for the `signingSecretCreate` mutation. */
export type SigningSecretCreatePayload = {
  __typename?: 'SigningSecretCreatePayload';
  /** The time at which the signing secret was created. */
  createdAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The raw secret value. Once returned here it is never accessible again. */
  secret?: Maybe<Scalars['String']>;
};

/** Return type for the `signingSecretDelete` mutation. */
export type SigningSecretDeletePayload = {
  __typename?: 'SigningSecretDeletePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

export type SlackIntegration = Integration & {
  __typename?: 'SlackIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** A human-friendly, unique identifier */
export type Slug = {
  __typename?: 'Slug';
  /** A human-friendly, unique identifier. */
  slug?: Maybe<Scalars['String']>;
};

/** An object that contains statistics. */
export type Stats = {
  __typename?: 'Stats';
  /** How many there are. */
  total: Scalars['Int'];
  /** How many are successfully passing. */
  totalSuccessful: Scalars['Int'];
};

/** The connection type for Group. */
export type SubgroupConnection = {
  __typename?: 'SubgroupConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<SubgroupEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Group>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type SubgroupEdge = {
  __typename?: 'SubgroupEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Group>;
};

/** translation missing: en.graphql.types.subscriber_type_enum.self */
export enum SubscriberTypeEnum {
  /** translation missing: en.graphql.types.subscriber_type_enum.service */
  Service = 'service',
  /** translation missing: en.graphql.types.subscriber_type_enum.user */
  User = 'user'
}

/** A record containing the notification that is subscribed to and the channels it can be received through. */
export type Subscription = {
  __typename?: 'Subscription';
  /** Channels for the subscription. */
  channels: Array<Channel>;
  /** The ID of the subscription. */
  id: Scalars['ID'];
  /** The notification this subscription is for. */
  notification: Notification;
};

/** The connection type for Subscription. */
export type SubscriptionConnection = {
  __typename?: 'SubscriptionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<SubscriptionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Subscription>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used in the `subscriptionCreate` mutation. */
export type SubscriptionCreateInput = {
  /** translation missing: en.graphql.types.subscription_create_input.external_address */
  externalAddress?: InputMaybe<Scalars['String']>;
  /** How the notification should be sent to the subscriber. */
  notificationChannelType: NotificationChannelTypeEnum;
  /** The identifier for the notification that is being subscribed to. */
  notificationId: Scalars['ID'];
  /** The identifier for the subscriber. */
  subscriberId: Scalars['ID'];
};

/** Return type for the `subscriptionCreate` mutation. */
export type SubscriptionCreatePayload = {
  __typename?: 'SubscriptionCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A record containing the notification that is subscribed to and the channels it can be received through. */
  subscription?: Maybe<Subscription>;
};

/** An edge in a connection. */
export type SubscriptionEdge = {
  __typename?: 'SubscriptionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Subscription>;
};

/** A suggestion to help users configure OpsLevel faster. */
export type Suggestion = {
  __typename?: 'Suggestion';
  /** The action recommended by the suggestion. */
  action?: Maybe<SuggestionAction>;
  /** A humanized version of alias. */
  displayAlias: Scalars['String'];
  /** The id of the suggestion. */
  id: Scalars['ID'];
  /** The list of the latest check result events, per source, that generated the suggestion. */
  latestCheckResultEventsPerSource?: Maybe<Array<CheckResult>>;
  /** The list of the latest deploy events, per source, that generated the suggestion. */
  latestDeployEventsPerSource?: Maybe<Array<Deploy>>;
  /** The alias specified in the events. */
  serviceAlias: Scalars['String'];
  /** The sources for this suggestion. */
  sources?: Maybe<SuggestionSourceConnection>;
  /** When the suggestion was created and updated. */
  timestamps: Timestamps;
  /** The type of the suggestion. */
  type: Scalars['String'];
};


/** A suggestion to help users configure OpsLevel faster. */
export type SuggestionSourcesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** An action recommended by the suggestion. */
export type SuggestionAction = {
  __typename?: 'SuggestionAction';
  /** The relative path to link to the service. */
  serviceHref?: Maybe<Scalars['String']>;
  /** The id of the action's service. */
  serviceId?: Maybe<Scalars['ID']>;
  /** The name of the action's service. */
  serviceName: Scalars['String'];
  /** The type of action. */
  type: SuggestionActionTypeEnum;
};

/** Input for actioning suggestions. */
export type SuggestionActionInput = {
  /** input for actioning a suggestion. */
  suggestions: Array<SuggestionInput>;
};

/** Possible actions. */
export enum SuggestionActionTypeEnum {
  /** Attach the given alias to a service. */
  AttachAlias = 'attach_alias',
  /** Attach historical events to the service for the given alias. */
  AttachHistoricalEvents = 'attach_historical_events',
  /** Create a service with the given alias as the service name. */
  CreateService = 'create_service',
  /** Create a service from an alert source. */
  CreateServiceFromAlertSource = 'create_service_from_alert_source',
  /** Create a service from a repository. */
  CreateServiceFromRepository = 'create_service_from_repository',
  /** Ignore the suggestion. */
  Ignored = 'ignored',
  /** Unignore the suggestion. */
  Unignored = 'unignored'
}

/** Record of actions taken via suggestions. */
export type SuggestionActivity = {
  __typename?: 'SuggestionActivity';
  /** Action that was taken via the suggestion */
  action?: Maybe<SuggestionActionTypeEnum>;
  /** Resource created/modified by the action. */
  affectedResource?: Maybe<SuggestionActivityAffectedResource>;
  /** The time the action was recorded. */
  createdAt: Scalars['ISO8601DateTime'];
  /** ID of the suggestion activity. */
  id: Scalars['ID'];
  /** Type of action that was suggested. */
  type?: Maybe<Scalars['String']>;
  /** User that performed the action. */
  user?: Maybe<User>;
  /** The alias or string used to create the suggestion. */
  value: Scalars['String'];
};

/** translation missing: en.graphql.types.suggestion_activity_affected_resource.self */
export type SuggestionActivityAffectedResource = Service | Suggestion;

/** The connection type for SuggestionActivity. */
export type SuggestionActivityConnection = {
  __typename?: 'SuggestionActivityConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<SuggestionActivityEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<SuggestionActivity>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type SuggestionActivityEdge = {
  __typename?: 'SuggestionActivityEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<SuggestionActivity>;
};

/** Fields that can be used as part of a filter for suggestion activity. */
export enum SuggestionActivityFilterEnum {
  /** Filter by `action` field. */
  Action = 'action',
  /** Filter by `type` field. */
  Type = 'type',
  /** Filter by `user` field. */
  User = 'user',
  /** Filter by `value` field. */
  Value = 'value'
}

/** Input to be used to filter types. */
export type SuggestionActivityFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: SuggestionActivityFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Fields that can be used to sort suggestion activity. */
export enum SuggestionActivitySortEnum {
  /** Order by `action` ascending. */
  ActionAsc = 'action_ASC',
  /** Order by `action` descending. */
  ActionDesc = 'action_DESC',
  /** Order by `created_at` ascending. */
  CreatedAtAsc = 'created_at_ASC',
  /** Order by `created_at` descending. */
  CreatedAtDesc = 'created_at_DESC',
  /** Order by `value` ascending. */
  ValueAsc = 'value_ASC',
  /** Order by `value` descending. */
  ValueDesc = 'value_DESC'
}

/** The connection type for Suggestion. */
export type SuggestionConnection = {
  __typename?: 'SuggestionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<SuggestionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Suggestion>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
  /** The number of unignored suggestions. */
  unignoredCount: Scalars['Int'];
};

/** An edge in a connection. */
export type SuggestionEdge = {
  __typename?: 'SuggestionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Suggestion>;
};

/** Fields that can be used as part of filter for suggestions. */
export enum SuggestionFilterEnum {
  /** Filter by `ignored` field. */
  Ignored = 'ignored',
  /** Filter by `type` field. */
  Type = 'type'
}

/** Input to be used to filter types. */
export type SuggestionFilterInput = {
  /** Value to be filtered. */
  arg?: InputMaybe<Scalars['String']>;
  /** Field to be filtered. */
  key: SuggestionFilterEnum;
  /** Type of operation to be applied to value on the field. */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Fields for actioning an suggestion. */
export type SuggestionInput = {
  /** The name of the service to create. Only needed for create type. */
  name?: InputMaybe<Scalars['String']>;
  /** The alias to attach to a service. Only needed for attach type. */
  serviceAlias?: InputMaybe<Scalars['String']>;
  /** The ID of the service to attach an alias to. Only needed for attach type. */
  serviceId?: InputMaybe<Scalars['String']>;
  /** Whether this suggestion action type has changed from the original suggestion. */
  suggestionActionModified?: InputMaybe<Scalars['Boolean']>;
  /** The ID of the suggestion being actioned. */
  suggestionId: Scalars['String'];
  /** Whether this suggestion has been modified from the original suggestion. */
  suggestionParamsModified?: InputMaybe<Scalars['Boolean']>;
  /** The type of action to perform. */
  type: SuggestionActionTypeEnum;
};

/** Sort possibilities for suggestions. */
export enum SuggestionSortEnum {
  /** Order by `alias` ascending */
  AliasAsc = 'alias_ASC',
  /** Order by `alias` descending */
  AliasDesc = 'alias_DESC',
  /** translation missing: en.graphql.types.suggestion_sort_enum.created_at_asc */
  CreatedAtAsc = 'created_at_ASC',
  /** translation missing: en.graphql.types.suggestion_sort_enum.created_at_desc */
  CreatedAtDesc = 'created_at_DESC'
}

/** A source of a suggestion. */
export type SuggestionSource = AlertSource | Repository;

/** The connection type for SuggestionSource. */
export type SuggestionSourceConnection = {
  __typename?: 'SuggestionSourceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<SuggestionSourceEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<SuggestionSource>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type SuggestionSourceEdge = {
  __typename?: 'SuggestionSourceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  metadata?: Maybe<Scalars['JSON']>;
  /** The item at the end of the edge. */
  node?: Maybe<SuggestionSource>;
};

/** Specifies the input fields used to update a suggestion. */
export type SuggestionUpdateInput = {
  /** Whether the suggestion should be ignored or not. */
  ignored: Scalars['Boolean'];
  /** The ids of the suggestions to be updated. */
  suggestionIds: Array<Scalars['ID']>;
};

/** The return type of a `suggestionUpdate` mutation. */
export type SuggestionUpdatePayload = {
  __typename?: 'SuggestionUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The ids of suggestions that have not been updated. */
  notActioned?: Maybe<Array<Scalars['ID']>>;
  /** The newly updated suggestions. */
  results?: Maybe<Array<Suggestion>>;
};

/** The response returned when actioning suggestions. */
export type SuggestionsActionPayload = {
  __typename?: 'SuggestionsActionPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** Suggestions that could not be actioned. */
  notActioned: Array<Scalars['String']>;
  /** Successfully actioned results. */
  results: Array<SuggestionsActionResult>;
};

/** The result of actioning a suggestion. */
export type SuggestionsActionResult = {
  __typename?: 'SuggestionsActionResult';
  /** The service alias that was attached. */
  alias?: Maybe<Scalars['String']>;
  /** The name of the service that the action was performed on or created by the suggestion. */
  name: Scalars['String'];
  /** The ID of the service that was created or that the action was performed on. */
  serviceId: Scalars['String'];
  /** The ID of the suggestion that was actioned. */
  suggestionId: Scalars['String'];
  /** The type of action that was performed on the suggestion. */
  type: Scalars['String'];
};

/** Return type for the `systemChildAssign` mutation. */
export type SystemChildAssignPayload = {
  __typename?: 'SystemChildAssignPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Return type for the `systemChildRemove` mutation. */
export type SystemChildRemovePayload = {
  __typename?: 'SystemChildRemovePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used in the `systemCreate` mutation. */
export type SystemCreateInput = {
  /** The description for the system. */
  description?: InputMaybe<Scalars['String']>;
  /** The name for the system. */
  name: Scalars['String'];
  /** Additional information about the system. */
  note?: InputMaybe<Scalars['String']>;
  /** The id of the owner for the system. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The parent domain for the system. */
  parent?: InputMaybe<IdentifierInput>;
};

/** Return type for the `systemCreate` mutation. */
export type SystemCreatePayload = {
  __typename?: 'SystemCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Specifies the input fields used in the `systemUpdate` mutation. */
export type SystemUpdateInput = {
  /** The description for the system. */
  description?: InputMaybe<Scalars['String']>;
  /** The name for the system. */
  name?: InputMaybe<Scalars['String']>;
  /** Additional information about the system. */
  note?: InputMaybe<Scalars['String']>;
  /** The id of the owner for the system. */
  ownerId?: InputMaybe<Scalars['ID']>;
  /** The parent domain for the system. */
  parent?: InputMaybe<IdentifierInput>;
};

/** Return type for the `systemUpdate` mutation. */
export type SystemUpdatePayload = {
  __typename?: 'SystemUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An arbitrary key-value pair associated with a resource. */
export type Tag = {
  __typename?: 'Tag';
  /** The unique identifier for the tag. */
  id: Scalars['ID'];
  /** The tag's key. */
  key: Scalars['String'];
  /** Whether the tag is locked or not. */
  locked: Scalars['Boolean'];
  /** The resource that the tag applies to. */
  owner: TagOwner;
  /** The internal ID for the tag. */
  plainId: Scalars['Int'];
  /** The tag's value. */
  value: Scalars['String'];
};

/** Arguments used to query with a certain tag. */
export type TagArgs = {
  /** The key of a tag. */
  key?: InputMaybe<Scalars['String']>;
  /** The value of a tag. */
  value?: InputMaybe<Scalars['String']>;
};

/** Specifies the input fields used to assign tags. */
export type TagAssignInput = {
  /** The alias of the resource that tags will be added to. */
  alias?: InputMaybe<Scalars['String']>;
  /** The id of the resource that the tags will be assigned to. */
  id?: InputMaybe<Scalars['ID']>;
  /** The desired tags to assign to the resource. */
  tags: Array<TagInput>;
  /** The type of resource `alias` refers to, if `alias` is provided. */
  type?: InputMaybe<TaggableResource>;
};

/** The return type of a `tagAssign` mutation. */
export type TagAssignPayload = {
  __typename?: 'TagAssignPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The new tags that have been assigned to the resource. */
  tags?: Maybe<Array<Tag>>;
};

/** The connection type for Tag. */
export type TagConnection = {
  __typename?: 'TagConnection';
  /** The suggested items to use for selection based on the implemented type. */
  autocomplete: Array<Scalars['String']>;
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<TagEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Tag>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};


/** The connection type for Tag. */
export type TagConnectionAutocompleteArgs = {
  searchTerm?: InputMaybe<Scalars['String']>;
};

/** Specifies the input fields used to create a tag. */
export type TagCreateInput = {
  /** The alias of the resource that this tag will be added to. */
  alias?: InputMaybe<Scalars['String']>;
  /** The id of the resource that this tag will be added to. */
  id?: InputMaybe<Scalars['ID']>;
  /** The tag's key. */
  key: Scalars['String'];
  /** The type of resource `alias` refers to, if `alias` is provided. */
  type?: InputMaybe<TaggableResource>;
  /** The tag's value. */
  value: Scalars['String'];
};

/** The return type of a `tagCreate` mutation. */
export type TagCreatePayload = {
  __typename?: 'TagCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly created tag. */
  tag?: Maybe<Tag>;
};

export type TagDefinedCheck = Check & {
  __typename?: 'TagDefinedCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The tag key where the tag predicate should be applied. */
  tagKey: Scalars['String'];
  /** The condition that should be satisfied by the tag value. */
  tagPredicate?: Maybe<Predicate>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Specifies the input fields used to delete a tag. */
export type TagDeleteInput = {
  /** The id of the tag to be deleted. */
  id: Scalars['ID'];
};

/** The return type of a `tagDelete` mutation. */
export type TagDeletePayload = {
  __typename?: 'TagDeletePayload';
  /** The id of the deleted tag. */
  deletedTagId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type TagEdge = {
  __typename?: 'TagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Tag>;
};

/** Specifies the basic input fields used to construct a tag. */
export type TagInput = {
  /** The tag's key. */
  key: Scalars['String'];
  /** The tag's value. */
  value: Scalars['String'];
};

/** A resource that a tag can be applied to. */
export type TagOwner = Repository | Service | Team;

/** The object type assigned to the tag */
export enum TagOwnerTypeEnum {
  /** Tags that are assigned to domains. */
  Domain = 'Domain',
  /** Tags that are assigned to repositories. */
  Repository = 'Repository',
  /** Tags that are assigned to services. */
  Service = 'Service',
  /** Tags that are assigned to systems. */
  System = 'System',
  /** Tags that are assigned to teams. */
  Team = 'Team'
}

/** The connection type for Tag. */
export type TagRepositoryConnection = {
  __typename?: 'TagRepositoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<TagRepositoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Tag>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type TagRepositoryEdge = {
  __typename?: 'TagRepositoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Tag>;
};

/** Specifies the input fields used to update a tag. */
export type TagUpdateInput = {
  /** The id of the tag to be updated. */
  id: Scalars['ID'];
  /** The tag's key. */
  key?: InputMaybe<Scalars['String']>;
  /** The tag's value. */
  value?: InputMaybe<Scalars['String']>;
};

/** The return type of a `tagUpdate` mutation. */
export type TagUpdatePayload = {
  __typename?: 'TagUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** The newly updated tag. */
  tag?: Maybe<Tag>;
};

/** Possible types to apply tags to. */
export enum TaggableResource {
  /** Used to identify a Repository. */
  Repository = 'Repository',
  /** Used to identify a Service. */
  Service = 'Service',
  /** Used to identify a Team. */
  Team = 'Team'
}

/** A team belongs to your organization. Teams can own multiple services. */
export type Team = {
  __typename?: 'Team';
  /** The human-friendly, unique identifier for the team. */
  alias?: Maybe<Scalars['String']>;
  /** A list of human-friendly, unique identifiers for the team. */
  aliases: Array<Scalars['String']>;
  /** The contacts for the team. */
  contacts?: Maybe<Array<Contact>>;
  /** A list of aliases and their details. */
  detailedAliases: Array<Alias>;
  /** The external UUID of this team. */
  externalUuid?: Maybe<Scalars['String']>;
  /** The group this team belongs to. */
  group?: Maybe<Group>;
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the team. */
  id: Scalars['ID'];
  /** The user who manages the team. */
  manager?: Maybe<User>;
  /** The users that are on the team. */
  members?: Maybe<UserConnection>;
  /** The team's display name. */
  name: Scalars['String'];
  /** The raw unsanitized description of what the team is responsible for. */
  rawResponsibilities?: Maybe<Scalars['String']>;
  /** A description of what the team is responsible for. */
  responsibilities?: Maybe<Scalars['String']>;
  /** The check results of the team's services. */
  serviceStat: CheckStats;
  /** The services the team is responsible for. */
  services: Array<Service>;
  /** A list of tags applied to the team. */
  tags?: Maybe<TagConnection>;
};


/** A team belongs to your organization. Teams can own multiple services. */
export type TeamMembersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A team belongs to your organization. Teams can own multiple services. */
export type TeamServicesArgs = {
  category?: InputMaybe<CategoryFilterInput>;
  connective?: InputMaybe<ConnectiveEnum>;
  filter?: InputMaybe<Array<ServiceFilterInput>>;
  filterId?: InputMaybe<Scalars['ID']>;
};


/** A team belongs to your organization. Teams can own multiple services. */
export type TeamTagsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for Team. */
export type TeamConnection = {
  __typename?: 'TeamConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<TeamEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Team>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used to create a team. */
export type TeamCreateInput = {
  /** The contacts for the team. */
  contacts?: InputMaybe<Array<ContactInput>>;
  /** The group this team belongs to. */
  group?: InputMaybe<IdentifierInput>;
  /** The email of the user who manages the team. */
  managerEmail?: InputMaybe<Scalars['String']>;
  /** A set of emails that identify users in OpsLevel */
  members?: InputMaybe<Array<TeamMembershipUserInput>>;
  /** The team's display name. */
  name: Scalars['String'];
  /** A description of what the team is responsible for. */
  responsibilities?: InputMaybe<Scalars['String']>;
};

/** The return type of a `teamCreate` mutation. */
export type TeamCreatePayload = {
  __typename?: 'TeamCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A team belongs to your organization. Teams can own multiple services. */
  team?: Maybe<Team>;
};

/** Specifies the input fields used to delete a team. */
export type TeamDeleteInput = {
  /** The alias of the team to be deleted. */
  alias?: InputMaybe<Scalars['String']>;
  /** The id of the team to be deleted. */
  id?: InputMaybe<Scalars['ID']>;
};

/** The return type of a `teamDelete` mutation. */
export type TeamDeletePayload = {
  __typename?: 'TeamDeletePayload';
  /** The deleted team's alias. */
  deletedTeamAlias?: Maybe<Scalars['String']>;
  /** The deleted team's id. */
  deletedTeamId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type TeamEdge = {
  __typename?: 'TeamEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Team>;
};

/** Input for adding members to a team */
export type TeamMembershipCreateInput = {
  /** A set of emails that identify users in OpsLevel */
  members: Array<TeamMembershipUserInput>;
  /** The ID of the team to add members */
  teamId: Scalars['ID'];
};

/** The response returned when creating memberships on teams */
export type TeamMembershipCreatePayload = {
  __typename?: 'TeamMembershipCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A list of users that are a member of the team */
  members?: Maybe<Array<User>>;
};

/** Input for removing members from a team */
export type TeamMembershipDeleteInput = {
  /** A set of emails that identify users in OpsLevel */
  members: Array<TeamMembershipUserInput>;
  /** The ID of the team to remove members from */
  teamId: Scalars['ID'];
};

/** The response returned when removing memberships on teams */
export type TeamMembershipDeletePayload = {
  __typename?: 'TeamMembershipDeletePayload';
  /** A list of users that have been removed from the team */
  deletedMembers?: Maybe<Array<User>>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** Input for specifiying members on a team */
export type TeamMembershipUserInput = {
  /** The user's email. */
  email: Scalars['String'];
};

/** Sort possibilities for teams. */
export enum TeamSortEnum {
  /** Order by manager's name ascending. */
  ManagerAsc = 'manager_ASC',
  /** Order by manager's name descending. */
  ManagerDesc = 'manager_DESC',
  /** Order by `name` ascending */
  NameAsc = 'name_ASC',
  /** Order by `name` descending */
  NameDesc = 'name_DESC',
  /** Alias to sort by `checks_passing` ascending. */
  ServiceStatAsc = 'service_stat_ASC',
  /** Alias to sort by `checks_passing` descending. */
  ServiceStatDesc = 'service_stat_DESC'
}

/** Specifies the input fields used to update a team. */
export type TeamUpdateInput = {
  /** The alias of the team to be updated. */
  alias?: InputMaybe<Scalars['String']>;
  /** The external UUID of this team. */
  extenralUuid?: InputMaybe<Scalars['String']>;
  /** The group this team belongs to. */
  group?: InputMaybe<IdentifierInput>;
  /** The id of the team to be updated. */
  id?: InputMaybe<Scalars['ID']>;
  /** The email of the user who manages the team. */
  managerEmail?: InputMaybe<Scalars['String']>;
  /** A set of emails that identify users in OpsLevel */
  members?: InputMaybe<Array<TeamMembershipUserInput>>;
  /** The team's display name. */
  name?: InputMaybe<Scalars['String']>;
  /** A description of what the team is responsible for. */
  responsibilities?: InputMaybe<Scalars['String']>;
};

/** The return type of a `teamUpdate` mutation. */
export type TeamUpdatePayload = {
  __typename?: 'TeamUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A team belongs to your organization. Teams can own multiple services. */
  team?: Maybe<Team>;
};

export type TerraformIntegration = Integration & {
  __typename?: 'TerraformIntegration';
  /** The id of the group. */
  accountKey: Scalars['String'];
  /** The path of the group. */
  accountName?: Maybe<Scalars['String']>;
  /** The web url of the group. */
  accountUrl?: Maybe<Scalars['String']>;
  /** Indicates whether or not the integration is currently active. */
  active: Scalars['Boolean'];
  /** The publicly routable URL where the integration can be accessed. */
  baseUrl?: Maybe<Scalars['String']>;
  /** Labels which relate this integration to similar integrations. */
  categories?: Maybe<Array<IntegrationCategory>>;
  /** The parameters used by the UI to display and configure integrations. */
  config?: Maybe<IntegrationConfig>;
  /** The time this integration was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The display name of the integration. */
  displayName?: Maybe<Scalars['String']>;
  /** The relative url to where the integration can be accessed. */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the integration. */
  id: Scalars['ID'];
  /**
   * The time that this integration was successfully installed, if null, this
   * indicates the integration was not completed installed.
   */
  installedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time this integration was invalidated, either from OpsLevel or via the external API. */
  invalidatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The time an event payload was provided for this integration. */
  lastEventReceived?: Maybe<Scalars['ISO8601DateTime']>;
  /** The name of the integration. */
  name: Scalars['String'];
  /** The notification channel. */
  notificationChannel?: Maybe<Scalars['String']>;
  /** Indicates whether OpsLevel will create service suggestions by analyzing the integration's repositories. */
  serviceDiscoveryEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * Indicates if OpsLevel will manage Datadog monitor webhooks automatically. When
   * set to false, you will be required to manually add the OpsLevel webhook to
   * your Datadog monitor notification message.
   */
  setWebhooksOnMonitors?: Maybe<Scalars['Boolean']>;
  /** The abbreviated or shorthand name for this integration, if any. Otherwise returns display name. */
  shortName?: Maybe<Scalars['String']>;
  /** This integration was not installed within the installation window. */
  stale: Scalars['Boolean'];
  /** If this integration is initializing and is not fully ready for use */
  stillLoading: Scalars['Boolean'];
  /** The type of the integration. */
  type: Scalars['String'];
  /** Indicates if this integration is being uninstalled from OpsLevel. */
  uninstallInProgress: Scalars['Boolean'];
  /** False when the integration has been unauthorized or removed by the remote system. */
  valid: Scalars['Boolean'];
  /** The version of the integration that is installed. */
  version?: Maybe<Scalars['String']>;
  /** The endpoint to send events via webhook (if applicable). */
  webhookUrl?: Maybe<Scalars['String']>;
};

/** An integration is a way of extending OpsLevel functionality. */
export type ThirdPartyIntegration = {
  __typename?: 'ThirdPartyIntegration';
  /** Labels which relate this integration to similar integrations. */
  categories: Array<IntegrationCategory>;
  /** The integration check description. */
  checkDescription?: Maybe<Scalars['String']>;
  /** The integration check button for create. */
  createButton?: Maybe<Scalars['String']>;
  /** The integration check description on create. */
  createDescription?: Maybe<Scalars['String']>;
  /** The integration check title on create. */
  createTitle?: Maybe<Scalars['String']>;
  /** The link to the documentation. */
  docsLink: Scalars['String'];
  /** The name of the integration. */
  name: Scalars['String'];
  /** The tool or system that will connect with the integration. */
  type: Scalars['String'];
};

/** A tier measures how critical or important a service is to your business. */
export type Tier = {
  __typename?: 'Tier';
  /** The human-friendly, unique identifier for the tier. */
  alias?: Maybe<Scalars['String']>;
  /** A brief description of the tier. */
  description?: Maybe<Scalars['String']>;
  /** The unique identifier for the tier. */
  id: Scalars['ID'];
  /** The numerical representation of the tier. */
  index?: Maybe<Scalars['Int']>;
  /** The display name of the tier. */
  name?: Maybe<Scalars['String']>;
};

/** Relevant timestamps. */
export type Timestamps = {
  __typename?: 'Timestamps';
  /** The time at which the entity was created. */
  createdAt: Scalars['ISO8601DateTime'];
  /** The time at which the entity was most recently updated. */
  updatedAt: Scalars['ISO8601DateTime'];
};

/** A tool is used to support the operations of a service. */
export type Tool = {
  __typename?: 'Tool';
  /** The category that the tool belongs to. */
  category?: Maybe<ToolCategory>;
  /** The human-friendly, unique identifier for the tool's category. */
  categoryAlias?: Maybe<Scalars['String']>;
  /** The human readable category. */
  displayCategory: Scalars['String'];
  /** The display name of the tool. */
  displayName?: Maybe<Scalars['String']>;
  /** The environment that the tool belongs to. */
  environment?: Maybe<Scalars['String']>;
  /** The unique identifier for the tool. */
  id: Scalars['ID'];
  /** Whether the tool is locked by opslevel.yml. */
  locked: Scalars['Boolean'];
  /** The unique DB ID for the tool. */
  plainId: Scalars['Int'];
  /** The service that is associated to the tool. */
  service: Service;
  /** The URL of the tool. */
  url: Scalars['String'];
};

/** The specific categories that a tool can belong to. */
export enum ToolCategory {
  /** Tools used for administrative purposes. */
  Admin = 'admin',
  /** Tools used as API documentation for this service. */
  ApiDocumentation = 'api_documentation',
  /** Tools used for tracking issues. */
  Backlog = 'backlog',
  /** Tools used for source code. */
  Code = 'code',
  /** Tools used for building/unit testing a service. */
  ContinuousIntegration = 'continuous_integration',
  /** Tools used for deploying changes to a service. */
  Deployment = 'deployment',
  /** Tools used for tracking/reporting errors. */
  Errors = 'errors',
  /** Tools used for managing feature flags. */
  FeatureFlag = 'feature_flag',
  /** Tools used for tracking/reporting the health of a service. */
  HealthChecks = 'health_checks',
  /** Tools used to surface incidents on a service. */
  Incidents = 'incidents',
  /** Tools used for tracking issues. */
  IssueTracking = 'issue_tracking',
  /** Tools used for displaying logs from services. */
  Logs = 'logs',
  /** Tools used for tracking/reporting service metrics. */
  Metrics = 'metrics',
  /** Tools used for orchestrating a service. */
  Orchestrator = 'orchestrator',
  /** Tools that do not fit into the available categories. */
  Other = 'other',
  /** Tools used for testing the resiliency of a service. */
  Resiliency = 'resiliency',
  /** Tools used for managing runbooks for a service. */
  Runbooks = 'runbooks',
  /** Tools used for performing security scans. */
  SecurityScans = 'security_scans',
  /** Tools used for reporting the status of a service. */
  StatusPage = 'status_page',
  /** Tools used as a wiki for this service. */
  Wiki = 'wiki'
}

/** The connection type for Tool. */
export type ToolConnection = {
  __typename?: 'ToolConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ToolEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Tool>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The number of returned nodes. */
  totalCount: Scalars['Int'];
};

/** Specifies the input fields used to create a tool. */
export type ToolCreateInput = {
  /** The category that the tool belongs to. */
  category: ToolCategory;
  /** The display name of the tool. */
  displayName: Scalars['String'];
  /** The environment that the tool belongs to. */
  environment?: InputMaybe<Scalars['String']>;
  /** The alias of the service the tool will be assigned to. */
  serviceAlias?: InputMaybe<Scalars['String']>;
  /** The id of the service the tool will be assigned to. */
  serviceId?: InputMaybe<Scalars['ID']>;
  /** The URL of the tool. */
  url: Scalars['String'];
};

/** The return type of a `toolCreate` mutation. */
export type ToolCreatePayload = {
  __typename?: 'ToolCreatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A tool is used to support the operations of a service. */
  tool?: Maybe<Tool>;
};

/** Specifies the input fields used to delete a tool. */
export type ToolDeleteInput = {
  /** The id of the tool to be deleted. */
  id: Scalars['ID'];
};

/** The return type of a `toolDelete` mutation. */
export type ToolDeletePayload = {
  __typename?: 'ToolDeletePayload';
  /** The deleted tool's id. */
  deletedToolId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type ToolEdge = {
  __typename?: 'ToolEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<Tool>;
};

/** Specifies the input fields used to update a tool. */
export type ToolUpdateInput = {
  /** The category that the tool belongs to. */
  category?: InputMaybe<ToolCategory>;
  /** The display name of the tool. */
  displayName?: InputMaybe<Scalars['String']>;
  /** The environment that the tool belongs to. */
  environment?: InputMaybe<Scalars['String']>;
  /** The id of the tool to be updated. */
  id: Scalars['ID'];
  /** The URL of the tool. */
  url?: InputMaybe<Scalars['String']>;
};

/** The return type of a `toolUpdate` payload. */
export type ToolUpdatePayload = {
  __typename?: 'ToolUpdatePayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A tool is used to support the operations of a service. */
  tool?: Maybe<Tool>;
};

export type ToolUsageCheck = Check & {
  __typename?: 'ToolUsageCheck';
  /** Additional arguments required by some check types. */
  args?: Maybe<Scalars['JSON']>;
  /** The campaign the check belongs to. */
  campaign?: Maybe<Campaign>;
  /** The category that the check belongs to. */
  category?: Maybe<Category>;
  /** The levels the check belongs to. */
  checkLevels?: Maybe<Array<CheckLevel>>;
  /** Description of the check type's purpose. */
  description: Scalars['String'];
  /** The date when the check will be automatically enabled. */
  enableOn?: Maybe<Scalars['ISO8601DateTime']>;
  /** If the check is enabled or not. */
  enabled: Scalars['Boolean'];
  /** The condition that the environment should satisfy to be evaluated. */
  environmentPredicate?: Maybe<Predicate>;
  /** The filter that the check belongs to. */
  filter?: Maybe<Filter>;
  /** Information needed to fix the check. */
  fix?: Maybe<Scalars['JSON']>;
  /** The id of the check. */
  id: Scalars['ID'];
  /**
   * The integration this check uses.
   * @deprecated Integration is now deprecated. Please use `integration` under the `CustomEventCheck` fragment instead.
   */
  integration?: Maybe<Integration>;
  /** The level that the check belongs to. */
  level?: Maybe<Level>;
  /** The display name of the check. */
  name: Scalars['String'];
  /** Additional information about the check. */
  notes?: Maybe<Scalars['String']>;
  /** The owner of the check. */
  owner?: Maybe<CheckOwner>;
  /** The raw unsanitized additional information about the check. */
  rawNotes?: Maybe<Scalars['String']>;
  /** The URL path for the check report. */
  reportHref: Scalars['String'];
  /** Summary of stats for services associated to this check. */
  stats?: Maybe<Stats>;
  /** The category that the tool belongs to. */
  toolCategory: ToolCategory;
  /** The condition that the tool name should satisfy to be evaluated. */
  toolNamePredicate?: Maybe<Predicate>;
  /** The condition that the tool url should satisfy to be evaludated. */
  toolUrlPredicate?: Maybe<Predicate>;
  /** The type of check. */
  type: CheckType;
  /** The url to the check. */
  url: Scalars['String'];
};

/** Operations that can be used on filters. */
export enum TypeEnum {
  /** Belongs to a group's hierarchy. */
  BelongsTo = 'belongs_to',
  /** Contains a specific value. */
  Contains = 'contains',
  /** Does not contain a specific value. */
  DoesNotContain = 'does_not_contain',
  /** Does not equal a specific value. */
  DoesNotEqual = 'does_not_equal',
  /** Specific attribute does not exist. */
  DoesNotExist = 'does_not_exist',
  /** Ends with a specific value. */
  EndsWith = 'ends_with',
  /** Equals a specific value. */
  Equals = 'equals',
  /** Specific attribute exists. */
  Exists = 'exists',
  /** Greater than or equal to a specific value (numeric only). */
  GreaterThanOrEqualTo = 'greater_than_or_equal_to',
  /** Less than or equal to a specific value (numeric only). */
  LessThanOrEqualTo = 'less_than_or_equal_to',
  /** Matches a value using a regular expression. */
  MatchesRegex = 'matches_regex',
  /** Satisfies version constraint (tag value only). */
  SatisfiesVersionConstraint = 'satisfies_version_constraint',
  /** Starts with a specific value. */
  StartsWith = 'starts_with'
}

/** A user is someone who belongs to an organization. */
export type User = {
  __typename?: 'User';
  /** The path to activate this user (legacy). */
  activatePath: Scalars['String'];
  /** True if this user is active, false if they are deactivated. */
  active: Scalars['Boolean'];
  /** The number of api tokens owned by this user */
  apiTokenCount: Scalars['Int'];
  /** A link to the user's avatar. */
  avatar: Scalars['String'];
  /** The checks owned by the user (through their teams). */
  checks: Array<Check>;
  /** The contacts for the user */
  contacts?: Maybe<Array<Contact>>;
  /** Policies relating to actions that can be performed on the user. */
  currentUserPolicies: UserPolicies;
  /** The path to deactivate this user (legacy). */
  deactivatePath: Scalars['String'];
  /** True if this user is deactivated and cannot be used. */
  deactivated: Scalars['Boolean'];
  /** The time that the user was deactivated. */
  deactivatedAt?: Maybe<Scalars['ISO8601DateTime']>;
  /** The path to delete this user (legacy). */
  deletePath: Scalars['String'];
  /** The path to edit this user (legacy). */
  editPath: Scalars['String'];
  /** The user's email. */
  email: Scalars['String'];
  /** Whether this user is managed externally. */
  hasProvider: Scalars['Boolean'];
  /** The relative path for this. Ex. /services/shopping_cart */
  href: Scalars['String'];
  /** A link to the HTML page for the resource. Ex. https://app.opslevel.com/services/shopping_cart */
  htmlUrl: Scalars['String'];
  /** The unique identifier for the user. */
  id: Scalars['ID'];
  /** The path to log out this user from all sessions (legacy). */
  invalidateSessionPath: Scalars['String'];
  /** The path to list this user (legacy). */
  listPath: Scalars['String'];
  /** The user's full name. */
  name: Scalars['String'];
  /** Whether the user accepted their invitation to OpsLevel or not. */
  pending: Scalars['Boolean'];
  /** The internal ID for the user. */
  plainId: Scalars['Int'];
  /** What provisioned this user. */
  provisionedBy?: Maybe<ProvisionedByEnum>;
  /** The repositories owned by the user (through their teams). */
  repositories: RepositoryConnection;
  /** The path to resend the invitation to this user (legacy). */
  resendInvitePath: Scalars['String'];
  /** The user's assigned role. */
  role?: Maybe<UserRole>;
  /** The services owned by the user (through their teams). */
  services: ServiceConnection;
  /** The path to show this user (legacy). */
  showPath: Scalars['String'];
  /** The notifications the user is subscribed to. */
  subscriptions: SubscriptionConnection;
  /** The teams the user is a member of. */
  teams: TeamConnection;
  /** Relevant timestamps for the user. */
  timestamps: Timestamps;
};


/** A user is someone who belongs to an organization. */
export type UserRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<RepositorySortEnum>;
};


/** A user is someone who belongs to an organization. */
export type UserServicesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
};


/** A user is someone who belongs to an organization. */
export type UserSubscriptionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


/** A user is someone who belongs to an organization. */
export type UserTeamsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** The connection type for User. */
export type UserConnection = {
  __typename?: 'UserConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<UserEdge>>>;
  /** The number of users on the account that match the provided filters or search criteria. */
  filteredCount?: Maybe<Scalars['Int']>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<User>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of users on the account. */
  totalCount: Scalars['Int'];
};

/** The return type of the user delete mutation. */
export type UserDeletePayload = {
  __typename?: 'UserDeletePayload';
  /** The email address of the deleted user. */
  deletedEmail?: Maybe<Scalars['String']>;
  /** The ID of the deleted user. */
  deletedId?: Maybe<Scalars['ID']>;
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
};

/** An edge in a connection. */
export type UserEdge = {
  __typename?: 'UserEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<User>;
};

/** Specifies the input fields used to identify a user. Exactly one field should be provided. */
export type UserIdentifierInput = {
  /** The email address of the user. */
  email?: InputMaybe<Scalars['String']>;
  /** The ID of the user. */
  id?: InputMaybe<Scalars['ID']>;
};

/** Specifies the input fields used to create and update a user. */
export type UserInput = {
  /** Whether or not the user is active. */
  active?: InputMaybe<Scalars['Boolean']>;
  /** The name of the user. */
  name?: InputMaybe<Scalars['String']>;
  /** The access role (e.g. user vs admin) of the user. */
  role?: InputMaybe<UserRole>;
};

/** The return type of user management mutations. */
export type UserPayload = {
  __typename?: 'UserPayload';
  /** List of errors that occurred while executing the mutation. */
  errors: Array<Error>;
  /** A user is someone who belongs to an organization. */
  user?: Maybe<User>;
};

export type UserPolicies = {
  __typename?: 'UserPolicies';
  /** Whether the user can be activated. */
  activate: Scalars['Boolean'];
  /** Whether the user can be deactivated. */
  deactivate: Scalars['Boolean'];
  /** Whether the user can be destroyed. */
  destroy: Scalars['Boolean'];
  /** Whether the user's emails can be updated. */
  editEmails: Scalars['Boolean'];
  /** Whether the user can be logged out. */
  invalidateSession: Scalars['Boolean'];
  /** Whether the user can have the invitation resent. */
  resendInvite: Scalars['Boolean'];
  /** Whether the current user can be updated. */
  update: Scalars['Boolean'];
};

/** A role that can be assigned to a user. */
export enum UserRole {
  /** An administrator on the account. */
  Admin = 'admin',
  /** A regular user on the account. */
  User = 'user'
}

/** translation missing: en.graphql.types.users_filter_enum.self */
export enum UsersFilterEnum {
  /** translation missing: en.graphql.types.users_filter_enum.email */
  Email = 'email',
  /** translation missing: en.graphql.types.users_filter_enum.name */
  Name = 'name',
  /** translation missing: en.graphql.types.users_filter_enum.pending */
  Pending = 'pending',
  /** translation missing: en.graphql.types.users_filter_enum.role */
  Role = 'role'
}

/** translation missing: en.graphql.types.users_filter_input.self */
export type UsersFilterInput = {
  /** translation missing: en.graphql.types.users_filter_input.arg */
  arg?: InputMaybe<Scalars['String']>;
  /** translation missing: en.graphql.types.users_filter_input.key */
  key: UsersFilterEnum;
  /** translation missing: en.graphql.types.users_filter_input.type */
  type?: InputMaybe<BasicTypeEnum>;
};

/** Sort possibilities for users. */
export enum UsersSortEnum {
  /** Sort by `email` ascending. */
  EmailAsc = 'email_ASC',
  /** Sort by `email` descending. */
  EmailDesc = 'email_DESC',
  /** Sort by `name` ascending. */
  NameAsc = 'name_ASC',
  /** Sort by `name` descending. */
  NameDesc = 'name_DESC',
  /** Sort by `pending` ascending. */
  PendingAsc = 'pending_ASC',
  /** Sort by `pending` descending. */
  PendingDesc = 'pending_DESC',
  /** Sort by `role` ascending. */
  RoleAsc = 'role_ASC',
  /** Sort by `role` descending. */
  RoleDesc = 'role_DESC',
  /** Sort by `status` ascending. */
  StatusAsc = 'status_ASC',
  /** Sort by `status` descending. */
  StatusDesc = 'status_DESC'
}

export type Get_All_ServicesQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type Get_All_ServicesQuery = { __typename?: 'Query', account: { __typename?: 'Account', servicesV2: { __typename?: 'ServiceConnection', pageInfo: { __typename?: 'PageInfo', endCursor?: string | null, hasNextPage: boolean }, nodes?: Array<(
        { __typename?: 'Service' }
        & { ' $fragmentRefs'?: { 'ServiceFragment': ServiceFragment } }
      ) | null> | null } } };

export type ServiceFragment = { __typename?: 'Service', id: string, alias?: string | null, name: string, linkable: boolean, href: string, locked: boolean, description?: string | null, htmlUrl: string, product?: string | null, language?: string | null, framework?: string | null, aliases: Array<string>, note?: string | null, hasServiceConfigError: boolean, creationSource?: ServiceCreationSourceEnum | null, level_index?: number | null, owner?: { __typename?: 'Team', name: string, href: string, contacts?: Array<(
      { __typename?: 'Contact' }
      & { ' $fragmentRefs'?: { 'ContactFragment': ContactFragment } }
    )> | null } | null, tier?: { __typename?: 'Tier', name?: string | null, index?: number | null } | null, tags?: { __typename?: 'TagConnection', nodes?: Array<{ __typename?: 'Tag', plainId: number, id: string, key: string, value: string } | null> | null } | null, service_stat?: { __typename?: 'CheckStats', num_checks: number, num_passing_checks: number } | null, lastDeploy?: { __typename?: 'Deploy', deployedAt?: any | null, commitSha?: string | null, author?: string | null } | null, service_level?: (
    { __typename?: 'ServiceStats' }
    & { ' $fragmentRefs'?: { 'ServiceLevelFragment': ServiceLevelFragment } }
  ) | null, tools?: { __typename?: 'ToolConnection', nodes?: Array<(
      { __typename?: 'Tool' }
      & { ' $fragmentRefs'?: { 'ServiceToolFragment': ServiceToolFragment } }
    ) | null> | null } | null, alertStatus: { __typename?: 'AlertStatus', index: number, type: AlertStatusTypeEnum }, onCalls?: { __typename?: 'OnCallConnection', nodes?: Array<{ __typename?: 'OnCall', name: string, externalEmail: string, gravatarHref?: string | null } | null> | null } | null, defaultServiceRepository?: { __typename?: 'ServiceRepository', repository: { __typename?: 'Repository', displayName: string, url?: string | null } } | null } & { ' $fragmentName'?: 'ServiceFragment' };

export type ServiceLevelFragment = { __typename?: 'ServiceStats', rubric: { __typename?: 'RubricReport', level?: { __typename?: 'Level', index?: number | null, name?: string | null } | null } } & { ' $fragmentName'?: 'ServiceLevelFragment' };

export type ServiceToolFragment = { __typename?: 'Tool', id: string, displayCategory: string, displayName?: string | null, environment?: string | null, url: string } & { ' $fragmentName'?: 'ServiceToolFragment' };

export type ContactFragment = { __typename?: 'Contact', displayName?: string | null, targetHref?: string | null, type: ContactType } & { ' $fragmentName'?: 'ContactFragment' };

export type SearchQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  sortBy?: InputMaybe<ServiceSortEnum>;
  searchText?: InputMaybe<Scalars['String']>;
}>;


export type SearchQuery = { __typename?: 'Query', account: { __typename?: 'Account', servicesV2: { __typename?: 'ServiceConnection', filteredCount?: number | null, edges?: Array<{ __typename?: 'ServiceEdge', node?: (
          { __typename?: 'Service' }
          & { ' $fragmentRefs'?: { 'ServicePartsFragment': ServicePartsFragment } }
        ) | null } | null> | null } } };

export type ServicePartsFragment = { __typename?: 'Service', id: string, alias?: string | null, name: string, linkable: boolean, href: string, locked: boolean, description?: string | null, htmlUrl: string, product?: string | null, language?: string | null, framework?: string | null, aliases: Array<string>, note?: string | null, hasServiceConfigError: boolean, creationSource?: ServiceCreationSourceEnum | null, level_index?: number | null, owner?: { __typename?: 'Team', name: string, href: string } | null, tier?: { __typename?: 'Tier', name?: string | null, index?: number | null } | null, tags?: { __typename?: 'TagConnection', nodes?: Array<{ __typename?: 'Tag', plainId: number, id: string, key: string, value: string } | null> | null } | null, service_stat?: { __typename?: 'CheckStats', num_checks: number, num_passing_checks: number } | null, lastDeploy?: { __typename?: 'Deploy', deployedAt?: any | null, commitSha?: string | null, author?: string | null } | null, service_level?: (
    { __typename?: 'ServiceStats' }
    & { ' $fragmentRefs'?: { 'ServiceLevelFragment': ServiceLevelFragment } }
  ) | null, tools?: { __typename?: 'ToolConnection', nodes?: Array<{ __typename?: 'Tool', displayCategory: string, displayName?: string | null, environment?: string | null, url: string } | null> | null } | null, alertStatus: { __typename?: 'AlertStatus', index: number, type: AlertStatusTypeEnum }, onCalls?: { __typename?: 'OnCallConnection', nodes?: Array<{ __typename?: 'OnCall', name: string, externalEmail: string } | null> | null } | null } & { ' $fragmentName'?: 'ServicePartsFragment' };

export const ContactFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Contact"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"targetHref"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]} as unknown as DocumentNode<ContactFragment, unknown>;
export const ServiceLevelFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceLevel"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServiceStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rubric"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"level"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<ServiceLevelFragment, unknown>;
export const ServiceToolFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceTool"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayCategory"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"environment"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<ServiceToolFragment, unknown>;
export const ServiceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Service"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Service"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"linkable"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"locked"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Contact"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"index"}}]}},{"kind":"Field","name":{"kind":"Name","value":"product"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"framework"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plainId"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"service_stat"},"name":{"kind":"Name","value":"checkStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"num_checks"},"name":{"kind":"Name","value":"totalChecks"}},{"kind":"Field","alias":{"kind":"Name","value":"num_passing_checks"},"name":{"kind":"Name","value":"totalPassingChecks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastDeploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deployedAt"}},{"kind":"Field","name":{"kind":"Name","value":"commitSha"}},{"kind":"Field","name":{"kind":"Name","value":"author"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasServiceConfigError"}},{"kind":"Field","alias":{"kind":"Name","value":"service_level"},"name":{"kind":"Name","value":"serviceStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceLevel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"level_index"},"name":{"kind":"Name","value":"levelIndex"}},{"kind":"Field","name":{"kind":"Name","value":"tools"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bestProdEnv"},"value":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceTool"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"alertStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"creationSource"}},{"kind":"Field","name":{"kind":"Name","value":"onCalls"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"EnumValue","value":"name_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"externalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"gravatarHref"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"defaultServiceRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Contact"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"targetHref"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceLevel"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServiceStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rubric"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"level"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceTool"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayCategory"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"environment"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<ServiceFragment, unknown>;
export const ServicePartsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Service"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"linkable"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"locked"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"index"}}]}},{"kind":"Field","name":{"kind":"Name","value":"product"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"framework"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plainId"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"service_stat"},"name":{"kind":"Name","value":"checkStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"num_checks"},"name":{"kind":"Name","value":"totalChecks"}},{"kind":"Field","alias":{"kind":"Name","value":"num_passing_checks"},"name":{"kind":"Name","value":"totalPassingChecks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastDeploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deployedAt"}},{"kind":"Field","name":{"kind":"Name","value":"commitSha"}},{"kind":"Field","name":{"kind":"Name","value":"author"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasServiceConfigError"}},{"kind":"Field","alias":{"kind":"Name","value":"service_level"},"name":{"kind":"Name","value":"serviceStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceLevel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"level_index"},"name":{"kind":"Name","value":"levelIndex"}},{"kind":"Field","name":{"kind":"Name","value":"tools"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bestProdEnv"},"value":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayCategory"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"environment"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"alertStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"creationSource"}},{"kind":"Field","name":{"kind":"Name","value":"onCalls"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"EnumValue","value":"name_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"externalEmail"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceLevel"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServiceStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rubric"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"level"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<ServicePartsFragment, unknown>;
export const Get_All_ServicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"get_all_services"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"servicesV2"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Service"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Contact"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"targetHref"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceLevel"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServiceStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rubric"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"level"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceTool"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayCategory"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"environment"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Service"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Service"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"linkable"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"locked"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Contact"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"index"}}]}},{"kind":"Field","name":{"kind":"Name","value":"product"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"framework"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plainId"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"service_stat"},"name":{"kind":"Name","value":"checkStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"num_checks"},"name":{"kind":"Name","value":"totalChecks"}},{"kind":"Field","alias":{"kind":"Name","value":"num_passing_checks"},"name":{"kind":"Name","value":"totalPassingChecks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastDeploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deployedAt"}},{"kind":"Field","name":{"kind":"Name","value":"commitSha"}},{"kind":"Field","name":{"kind":"Name","value":"author"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasServiceConfigError"}},{"kind":"Field","alias":{"kind":"Name","value":"service_level"},"name":{"kind":"Name","value":"serviceStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceLevel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"level_index"},"name":{"kind":"Name","value":"levelIndex"}},{"kind":"Field","name":{"kind":"Name","value":"tools"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bestProdEnv"},"value":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceTool"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"alertStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"creationSource"}},{"kind":"Field","name":{"kind":"Name","value":"onCalls"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"EnumValue","value":"name_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"externalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"gravatarHref"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"defaultServiceRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<Get_All_ServicesQuery, Get_All_ServicesQueryVariables>;
export const SearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"search"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ServiceSortEnum"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"searchText"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"servicesV2"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"searchTerm"},"value":{"kind":"Variable","name":{"kind":"Name","value":"searchText"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filteredCount"}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceParts"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceLevel"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServiceStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rubric"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"level"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServiceParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Service"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"linkable"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"locked"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"index"}}]}},{"kind":"Field","name":{"kind":"Name","value":"product"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"framework"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plainId"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"service_stat"},"name":{"kind":"Name","value":"checkStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"num_checks"},"name":{"kind":"Name","value":"totalChecks"}},{"kind":"Field","alias":{"kind":"Name","value":"num_passing_checks"},"name":{"kind":"Name","value":"totalPassingChecks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastDeploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deployedAt"}},{"kind":"Field","name":{"kind":"Name","value":"commitSha"}},{"kind":"Field","name":{"kind":"Name","value":"author"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasServiceConfigError"}},{"kind":"Field","alias":{"kind":"Name","value":"service_level"},"name":{"kind":"Name","value":"serviceStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServiceLevel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"level_index"},"name":{"kind":"Name","value":"levelIndex"}},{"kind":"Field","name":{"kind":"Name","value":"tools"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bestProdEnv"},"value":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayCategory"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"environment"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"alertStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"creationSource"}},{"kind":"Field","name":{"kind":"Name","value":"onCalls"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"EnumValue","value":"name_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"externalEmail"}}]}}]}}]}}]} as unknown as DocumentNode<SearchQuery, SearchQueryVariables>;