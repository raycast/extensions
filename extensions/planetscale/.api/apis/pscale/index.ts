import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'pscale/v1 (api/6.1.1)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * When using a service token, returns the list of organizations the service token has
   * access to. When using an OAuth token, returns the list of organizations the user has
   * access to.
   * ### Authorization
   * A   OAuth token must have at least one of the following   scopes in order to use this
   * API endpoint:
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | User | `read_organizations` |
   *
   * @summary List organizations
   */
  listOrganizations(metadata?: types.ListOrganizationsMetadataParam): Promise<FetchResponse<200, types.ListOrganizationsResponse200>> {
    return this.core.fetch('/organizations', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_organization`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | User | `read_organizations` |
   * | Organization | `read_organization` |
   *
   * @summary Get an organization
   */
  getAnOrganization(metadata: types.GetAnOrganizationMetadataParam): Promise<FetchResponse<200, types.GetAnOrganizationResponse200>> {
    return this.core.fetch('/organizations/{name}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A   OAuth token must have at least one of the following   scopes in order to use this
   * API endpoint:
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `write_organization` |
   *
   * @summary Update an organization
   */
  updateAnOrganization(body: types.UpdateAnOrganizationBodyParam, metadata: types.UpdateAnOrganizationMetadataParam): Promise<FetchResponse<200, types.UpdateAnOrganizationResponse200>>;
  updateAnOrganization(metadata: types.UpdateAnOrganizationMetadataParam): Promise<FetchResponse<200, types.UpdateAnOrganizationResponse200>>;
  updateAnOrganization(body?: types.UpdateAnOrganizationBodyParam | types.UpdateAnOrganizationMetadataParam, metadata?: types.UpdateAnOrganizationMetadataParam): Promise<FetchResponse<200, types.UpdateAnOrganizationResponse200>> {
    return this.core.fetch('/organizations/{name}', 'patch', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_organization`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | User | `read_organizations` |
   * | Organization | `read_organization` |
   *
   * @summary List regions for an organization
   */
  listRegionsForAnOrganization(metadata: types.ListRegionsForAnOrganizationMetadataParam): Promise<FetchResponse<200, types.ListRegionsForAnOrganizationResponse200>> {
    return this.core.fetch('/organizations/{name}/regions', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_database`, `delete_database`, `write_database`, `read_branch`, `delete_branch`,
   * `create_branch`, `delete_production_branch`, `connect_branch`,
   * `connect_production_branch`, `delete_branch_password`,
   * `delete_production_branch_password`, `read_deploy_request`, `create_deploy_request`,
   * `approve_deploy_request`, `read_schema_recommendations`, `close_schema_recommendations`,
   * `read_comment`, `create_comment`, `restore_backup`, `restore_production_branch_backup`,
   * `read_backups`, `write_backups`, `delete_backups`, `delete_production_branch_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_databases` |
   *
   * @summary List databases
   */
  listDatabases(metadata: types.ListDatabasesMetadataParam): Promise<FetchResponse<200, types.ListDatabasesResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `create_databases`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `create_databases` |
   *
   * @summary Create a database
   */
  createADatabase(body: types.CreateADatabaseBodyParam, metadata: types.CreateADatabaseMetadataParam): Promise<FetchResponse<201, types.CreateADatabaseResponse201>> {
    return this.core.fetch('/organizations/{organization}/databases', 'post', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_branch`, `delete_branch`, `create_branch`, `connect_production_branch`,
   * `connect_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_branches` |
   * | Database | `read_branches` |
   * | Branch | `read_branch` |
   *
   * @summary List branches
   */
  listBranches(metadata: types.ListBranchesMetadataParam): Promise<FetchResponse<200, types.ListBranchesResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `create_branch`, `restore_production_branch_backup`, `restore_backup`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `write_branches`, `restore_production_branch_backups`,
   * `restore_backups` |
   * | Database | `write_branches`, `restore_production_branch_backups`, `restore_backups` |
   * | Branch | `restore_backups` |
   *
   * @summary Create a branch
   */
  createABranch(body: types.CreateABranchBodyParam, metadata: types.CreateABranchMetadataParam): Promise<FetchResponse<201, types.CreateABranchResponse201>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches', 'post', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_backups` |
   * | Database | `read_backups` |
   * | Branch | `read_backups` |
   *
   * @summary List backups
   */
  listBackups(metadata: types.ListBackupsMetadataParam): Promise<FetchResponse<200, types.ListBackupsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/backups', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `write_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `write_backups` |
   * | Database | `write_backups` |
   * | Branch | `write_backups` |
   *
   * @summary Create a backup
   */
  createABackup(body: types.CreateABackupBodyParam, metadata: types.CreateABackupMetadataParam): Promise<FetchResponse<201, types.CreateABackupResponse201>>;
  createABackup(metadata: types.CreateABackupMetadataParam): Promise<FetchResponse<201, types.CreateABackupResponse201>>;
  createABackup(body?: types.CreateABackupBodyParam | types.CreateABackupMetadataParam, metadata?: types.CreateABackupMetadataParam): Promise<FetchResponse<201, types.CreateABackupResponse201>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/backups', 'post', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_backups` |
   * | Database | `read_backups` |
   * | Branch | `read_backups` |
   *
   * @summary Get a backup
   */
  getABackup(metadata: types.GetABackupMetadataParam): Promise<FetchResponse<200, types.GetABackupResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/backups/{id}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `delete_backups`, `delete_production_branch_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `delete_backups`, `delete_production_branch_backups` |
   * | Database | `delete_backups`, `delete_production_branch_backups` |
   * | Branch | `delete_backups` |
   *
   * @summary Delete a backup
   */
  deleteABackup(metadata: types.DeleteABackupMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/backups/{id}', 'delete', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_branch`, `delete_branch`, `create_branch`, `connect_production_branch`,
   * `connect_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `manage_passwords`, `manage_production_branch_passwords` |
   * | Database | `manage_passwords`, `manage_production_branch_passwords` |
   * | Branch | `manage_passwords` |
   *
   * @summary List passwords
   */
  listPasswords(metadata: types.ListPasswordsMetadataParam): Promise<FetchResponse<200, types.ListPasswordsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/passwords', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `connect_production_branch`, `create_branch_password`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `manage_passwords`, `manage_production_branch_passwords` |
   * | Database | `manage_passwords`, `manage_production_branch_passwords` |
   * | Branch | `manage_passwords` |
   *
   * @summary Create a password
   */
  createAPassword(body: types.CreateAPasswordBodyParam, metadata: types.CreateAPasswordMetadataParam): Promise<FetchResponse<201, types.CreateAPasswordResponse201>>;
  createAPassword(metadata: types.CreateAPasswordMetadataParam): Promise<FetchResponse<201, types.CreateAPasswordResponse201>>;
  createAPassword(body?: types.CreateAPasswordBodyParam | types.CreateAPasswordMetadataParam, metadata?: types.CreateAPasswordMetadataParam): Promise<FetchResponse<201, types.CreateAPasswordResponse201>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/passwords', 'post', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_branch`, `delete_branch`, `create_branch`, `connect_production_branch`,
   * `connect_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `manage_passwords`, `manage_production_branch_passwords` |
   * | Database | `manage_passwords`, `manage_production_branch_passwords` |
   * | Branch | `manage_passwords` |
   *
   * @summary Get a password
   */
  getAPassword(metadata: types.GetAPasswordMetadataParam): Promise<FetchResponse<200, types.GetAPasswordResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/passwords/{id}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `connect_production_branch`, `create_branch_password`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `manage_passwords`, `manage_production_branch_passwords` |
   * | Database | `manage_passwords`, `manage_production_branch_passwords` |
   * | Branch | `manage_passwords` |
   *
   * @summary Update a password
   */
  updateAPassword(body: types.UpdateAPasswordBodyParam, metadata: types.UpdateAPasswordMetadataParam): Promise<FetchResponse<200, types.UpdateAPasswordResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/passwords/{id}', 'patch', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `delete_production_branch_password`, `delete_branch_password`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `manage_passwords`, `manage_production_branch_passwords` |
   * | Database | `manage_passwords`, `manage_production_branch_passwords` |
   * | Branch | `manage_passwords` |
   *
   * @summary Delete a password
   */
  deleteAPassword(metadata: types.DeleteAPasswordMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/passwords/{id}', 'delete', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `connect_production_branch`, `create_branch_password`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `manage_passwords`, `manage_production_branch_passwords` |
   * | Database | `manage_passwords`, `manage_production_branch_passwords` |
   * | Branch | `manage_passwords` |
   *
   * @summary Renew a password
   */
  renewAPassword(metadata: types.RenewAPasswordMetadataParam): Promise<FetchResponse<200, types.RenewAPasswordResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{branch}/passwords/{id}/renew', 'post', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_branch`, `delete_branch`, `create_branch`, `connect_production_branch`,
   * `connect_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_branches` |
   * | Database | `read_branches` |
   * | Branch | `read_branch` |
   *
   * @summary Get a branch
   */
  getABranch(metadata: types.GetABranchMetadataParam): Promise<FetchResponse<200, types.GetABranchResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `delete_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `delete_branches`, `delete_production_branches` |
   * | Database | `delete_branches`, `delete_production_branches` |
   * | Branch | `delete_branch` |
   *
   * @summary Delete a branch
   */
  deleteABranch(metadata: types.DeleteABranchMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}', 'delete', metadata);
  }

  /**
   * Demotes a branch from production to development
   * ### Authorization
   * A   OAuth token must have at least one of the following   scopes in order to use this
   * API endpoint:
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `demote_branches` |
   * | Database | `demote_branches` |
   *
   * @summary Demote a branch
   */
  demoteABranch(metadata: types.DemoteABranchMetadataParam): Promise<FetchResponse<200, types.DemoteABranchResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}/demote', 'post', metadata);
  }

  /**
   * Promotes a branch from development to production
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `connect_production_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `promote_branches` |
   * | Database | `promote_branches` |
   *
   * @summary Promote a branch
   */
  promoteABranch(metadata: types.PromoteABranchMetadataParam): Promise<FetchResponse<200, types.PromoteABranchResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}/promote', 'post', metadata);
  }

  /**
   *
   *
   * @summary Enable safe migrations for a branch
   */
  enableSafeMigrationsForABranch(metadata: types.EnableSafeMigrationsForABranchMetadataParam): Promise<FetchResponse<200, types.EnableSafeMigrationsForABranchResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}/safe-migrations', 'post', metadata);
  }

  /**
   *
   *
   * @summary Disable safe migrations for a branch
   */
  disableSafeMigrationsForABranch(metadata: types.DisableSafeMigrationsForABranchMetadataParam): Promise<FetchResponse<200, types.DisableSafeMigrationsForABranchResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}/safe-migrations', 'delete', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_branch`, `delete_branch`, `create_branch`, `connect_production_branch`,
   * `connect_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_branches` |
   * | Database | `read_branches` |
   * | Branch | `read_branch` |
   *
   * @summary Get a branch schema
   */
  getABranchSchema(metadata: types.GetABranchSchemaMetadataParam): Promise<FetchResponse<200, types.GetABranchSchemaResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}/schema', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_branch`, `delete_branch`, `create_branch`, `connect_production_branch`,
   * `connect_branch`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_branches` |
   * | Database | `read_branches` |
   * | Branch | `read_branch` |
   *
   * @summary Lint a branch schema
   */
  lintABranchSchema(metadata: types.LintABranchSchemaMetadataParam): Promise<FetchResponse<200, types.LintABranchSchemaResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/branches/{name}/schema/lint', 'get', metadata);
  }

  /**
   * The deploy queue returns the current list of deploy requests in the order they will be
   * deployed.
   *
   *
   * @summary Get the deploy queue
   */
  getTheDeployQueue(metadata: types.GetTheDeployQueueMetadataParam): Promise<FetchResponse<200, types.GetTheDeployQueueResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-queue', 'get', metadata);
  }

  /**
   * List deploy requests for a database
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_deploy_requests` |
   * | Database | `read_deploy_requests` |
   *
   * @summary List deploy requests
   */
  listDeployRequests(metadata: types.ListDeployRequestsMetadataParam): Promise<FetchResponse<200, types.ListDeployRequestsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_requests`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `write_deploy_requests` |
   * | Database | `write_deploy_requests` |
   *
   * @summary Create a deploy request
   */
  createADeployRequest(body: types.CreateADeployRequestBodyParam, metadata: types.CreateADeployRequestMetadataParam): Promise<FetchResponse<201, types.CreateADeployRequestResponse201>>;
  createADeployRequest(metadata: types.CreateADeployRequestMetadataParam): Promise<FetchResponse<201, types.CreateADeployRequestResponse201>>;
  createADeployRequest(body?: types.CreateADeployRequestBodyParam | types.CreateADeployRequestMetadataParam, metadata?: types.CreateADeployRequestMetadataParam): Promise<FetchResponse<201, types.CreateADeployRequestResponse201>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests', 'post', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_deploy_requests` |
   * | Database | `read_deploy_requests` |
   *
   * @summary Get a deploy request
   */
  getADeployRequest(metadata: types.GetADeployRequestMetadataParam): Promise<FetchResponse<200, types.GetADeployRequestResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `write_deploy_requests` |
   * | Database | `write_deploy_requests` |
   *
   * @summary Close a deploy request
   */
  closeADeployRequest(body: types.CloseADeployRequestBodyParam, metadata: types.CloseADeployRequestMetadataParam): Promise<FetchResponse<200, types.CloseADeployRequestResponse200>>;
  closeADeployRequest(metadata: types.CloseADeployRequestMetadataParam): Promise<FetchResponse<200, types.CloseADeployRequestResponse200>>;
  closeADeployRequest(body?: types.CloseADeployRequestBodyParam | types.CloseADeployRequestMetadataParam, metadata?: types.CloseADeployRequestMetadataParam): Promise<FetchResponse<200, types.CloseADeployRequestResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}', 'patch', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Complete a gated deploy request
   */
  completeAGatedDeployRequest(metadata: types.CompleteAGatedDeployRequestMetadataParam): Promise<FetchResponse<200, types.CompleteAGatedDeployRequestResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/apply-deploy', 'post', metadata);
  }

  /**
   * Enables or disabled the auto-apply setting for a deploy request
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Update auto-apply for deploy request
   */
  updateAutoApplyForDeployRequest(body: types.UpdateAutoApplyForDeployRequestBodyParam, metadata: types.UpdateAutoApplyForDeployRequestMetadataParam): Promise<FetchResponse<200, types.UpdateAutoApplyForDeployRequestResponse200>>;
  updateAutoApplyForDeployRequest(metadata: types.UpdateAutoApplyForDeployRequestMetadataParam): Promise<FetchResponse<200, types.UpdateAutoApplyForDeployRequestResponse200>>;
  updateAutoApplyForDeployRequest(body?: types.UpdateAutoApplyForDeployRequestBodyParam | types.UpdateAutoApplyForDeployRequestMetadataParam, metadata?: types.UpdateAutoApplyForDeployRequestMetadataParam): Promise<FetchResponse<200, types.UpdateAutoApplyForDeployRequestResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/auto-apply', 'put', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Cancel a queued deploy request
   */
  cancelAQueuedDeployRequest(metadata: types.CancelAQueuedDeployRequestMetadataParam): Promise<FetchResponse<200, types.CancelAQueuedDeployRequestResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/cancel', 'post', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Complete an errored deploy
   */
  completeAnErroredDeploy(metadata: types.CompleteAnErroredDeployMetadataParam): Promise<FetchResponse<200, types.CompleteAnErroredDeployResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/complete-deploy', 'post', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Queue a deploy request
   */
  queueADeployRequest(metadata: types.QueueADeployRequestMetadataParam): Promise<FetchResponse<200, types.QueueADeployRequestResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/deploy', 'post', metadata);
  }

  /**
   * Get the deployment for a deploy request
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_deploy_requests` |
   * | Database | `read_deploy_requests` |
   *
   * @summary Get a deployment
   */
  getADeployment(metadata: types.GetADeploymentMetadataParam): Promise<FetchResponse<200, types.GetADeploymentResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/deployment', 'get', metadata);
  }

  /**
   * List deploy operations for a deploy request
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_deploy_requests` |
   * | Database | `read_deploy_requests` |
   *
   * @summary List deploy operations
   */
  listDeployOperations(metadata: types.ListDeployOperationsMetadataParam): Promise<FetchResponse<200, types.ListDeployOperationsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/operations', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Complete a revert
   */
  completeARevert(metadata: types.CompleteARevertMetadataParam): Promise<FetchResponse<200, types.CompleteARevertResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/revert', 'post', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_deploy_requests` |
   * | Database | `read_deploy_requests` |
   *
   * @summary List deploy request reviews
   */
  listDeployRequestReviews(metadata: types.ListDeployRequestReviewsMetadataParam): Promise<FetchResponse<200, types.ListDeployRequestReviewsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/reviews', 'get', metadata);
  }

  /**
   * Review a deploy request by either approving or commenting on the deploy request
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `approve_deploy_request`, `review_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `approve_deploy_requests` |
   * | Database | `approve_deploy_requests` |
   *
   * @summary Review a deploy request
   */
  reviewADeployRequest(body: types.ReviewADeployRequestBodyParam, metadata: types.ReviewADeployRequestMetadataParam): Promise<FetchResponse<201, types.ReviewADeployRequestResponse201>>;
  reviewADeployRequest(metadata: types.ReviewADeployRequestMetadataParam): Promise<FetchResponse<201, types.ReviewADeployRequestResponse201>>;
  reviewADeployRequest(body?: types.ReviewADeployRequestBodyParam | types.ReviewADeployRequestMetadataParam, metadata?: types.ReviewADeployRequestMetadataParam): Promise<FetchResponse<201, types.ReviewADeployRequestResponse201>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/reviews', 'post', body, metadata);
  }

  /**
   * Skips the revert period for a deploy request
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_deploy_request`, `create_deploy_request`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `deploy_deploy_requests` |
   * | Database | `deploy_deploy_requests` |
   *
   * @summary Skip revert period
   */
  skipRevertPeriod(metadata: types.SkipRevertPeriodMetadataParam): Promise<FetchResponse<200, types.SkipRevertPeriodResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{database}/deploy-requests/{number}/skip-revert', 'post', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_database`, `delete_database`, `write_database`, `read_branch`, `delete_branch`,
   * `create_branch`, `delete_production_branch`, `connect_branch`,
   * `connect_production_branch`, `delete_branch_password`,
   * `delete_production_branch_password`, `read_deploy_request`, `create_deploy_request`,
   * `approve_deploy_request`, `read_schema_recommendations`, `close_schema_recommendations`,
   * `read_comment`, `create_comment`, `restore_backup`, `restore_production_branch_backup`,
   * `read_backups`, `write_backups`, `delete_backups`, `delete_production_branch_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_databases` |
   * | Database | `read_database` |
   *
   * @summary Get a database
   */
  getADatabase(metadata: types.GetADatabaseMetadataParam): Promise<FetchResponse<200, types.GetADatabaseResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{name}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `write_database`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `write_databases` |
   * | Database | `write_database` |
   *
   * @summary Update database settings
   */
  updateDatabaseSettings(body: types.UpdateDatabaseSettingsBodyParam, metadata: types.UpdateDatabaseSettingsMetadataParam): Promise<FetchResponse<200, types.UpdateDatabaseSettingsResponse200>>;
  updateDatabaseSettings(metadata: types.UpdateDatabaseSettingsMetadataParam): Promise<FetchResponse<200, types.UpdateDatabaseSettingsResponse200>>;
  updateDatabaseSettings(body?: types.UpdateDatabaseSettingsBodyParam | types.UpdateDatabaseSettingsMetadataParam, metadata?: types.UpdateDatabaseSettingsMetadataParam): Promise<FetchResponse<200, types.UpdateDatabaseSettingsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{name}', 'patch', body, metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `delete_database`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `delete_databases` |
   * | Database | `delete_database` |
   *
   * @summary Delete a database
   */
  deleteADatabase(metadata: types.DeleteADatabaseMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/organizations/{organization}/databases/{name}', 'delete', metadata);
  }

  /**
   * List read-only regions for the database's default branch
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_database`, `delete_database`, `write_database`, `read_branch`, `delete_branch`,
   * `create_branch`, `delete_production_branch`, `connect_branch`,
   * `connect_production_branch`, `delete_branch_password`,
   * `delete_production_branch_password`, `read_deploy_request`, `create_deploy_request`,
   * `approve_deploy_request`, `read_schema_recommendations`, `close_schema_recommendations`,
   * `read_comment`, `create_comment`, `restore_backup`, `restore_production_branch_backup`,
   * `read_backups`, `write_backups`, `delete_backups`, `delete_production_branch_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_branches` |
   * | Database | `read_branches` |
   *
   * @summary List read-only regions
   */
  listReadOnlyRegions(metadata: types.ListReadOnlyRegionsMetadataParam): Promise<FetchResponse<200, types.ListReadOnlyRegionsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{name}/read-only-regions', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token or OAuth token must have at least one of the following access or scopes
   * in order to use this API endpoint:
   *
   * **Service Token Accesses**
   *  `read_database`, `delete_database`, `write_database`, `read_branch`, `delete_branch`,
   * `create_branch`, `delete_production_branch`, `connect_branch`,
   * `connect_production_branch`, `delete_branch_password`,
   * `delete_production_branch_password`, `read_deploy_request`, `create_deploy_request`,
   * `approve_deploy_request`, `read_schema_recommendations`, `close_schema_recommendations`,
   * `read_comment`, `create_comment`, `restore_backup`, `restore_production_branch_backup`,
   * `read_backups`, `write_backups`, `delete_backups`, `delete_production_branch_backups`
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | Organization | `read_databases` |
   * | Database | `read_database` |
   *
   * @summary List database regions
   */
  listDatabaseRegions(metadata: types.ListDatabaseRegionsMetadataParam): Promise<FetchResponse<200, types.ListDatabaseRegionsResponse200>> {
    return this.core.fetch('/organizations/{organization}/databases/{name}/regions', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token   must have at least one of the following access   in order to use this
   * API endpoint:
   *
   * **Service Token Accesses**
   *  `read_oauth_applications`
   *
   *
   *
   * @summary List OAuth applications
   */
  listOauthApplications(metadata: types.ListOauthApplicationsMetadataParam): Promise<FetchResponse<200, types.ListOauthApplicationsResponse200>> {
    return this.core.fetch('/organizations/{organization}/oauth-applications', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token   must have at least one of the following access   in order to use this
   * API endpoint:
   *
   * **Service Token Accesses**
   *  `read_oauth_applications`
   *
   *
   *
   * @summary Get an OAuth application
   */
  getAnOauthApplication(metadata: types.GetAnOauthApplicationMetadataParam): Promise<FetchResponse<200, types.GetAnOauthApplicationResponse200>> {
    return this.core.fetch('/organizations/{organization}/oauth-applications/{application_id}', 'get', metadata);
  }

  /**
   * List OAuth tokens created by an OAuth application
   * ### Authorization
   * A service token   must have at least one of the following access   in order to use this
   * API endpoint:
   *
   * **Service Token Accesses**
   *  `read_oauth_tokens`
   *
   *
   *
   * @summary List OAuth tokens
   */
  listOauthTokens(metadata: types.ListOauthTokensMetadataParam): Promise<FetchResponse<200, types.ListOauthTokensResponse200>> {
    return this.core.fetch('/organizations/{organization}/oauth-applications/{application_id}/tokens', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token   must have at least one of the following access   in order to use this
   * API endpoint:
   *
   * **Service Token Accesses**
   *  `read_oauth_tokens`
   *
   *
   *
   * @summary Get an OAuth token
   */
  getAnOauthToken(metadata: types.GetAnOauthTokenMetadataParam): Promise<FetchResponse<200, types.GetAnOauthTokenResponse200>> {
    return this.core.fetch('/organizations/{organization}/oauth-applications/{application_id}/tokens/{token_id}', 'get', metadata);
  }

  /**
   * ### Authorization
   * A service token   must have at least one of the following access   in order to use this
   * API endpoint:
   *
   * **Service Token Accesses**
   *  `delete_oauth_tokens`
   *
   *
   *
   * @summary Delete an OAuth token
   */
  deleteAnOauthToken(metadata: types.DeleteAnOauthTokenMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/organizations/{organization}/oauth-applications/{application_id}/tokens/{token_id}', 'delete', metadata);
  }

  /**
   * Create an OAuth token from an authorization grant code, or refresh an OAuth token from a
   * refresh token
   * ### Authorization
   * A service token   must have at least one of the following access   in order to use this
   * API endpoint:
   *
   * **Service Token Accesses**
   *  `write_oauth_tokens`
   *
   *
   *
   * @summary Create or renew an OAuth token
   */
  createOrRenewAnOauthToken(body: types.CreateOrRenewAnOauthTokenBodyParam, metadata: types.CreateOrRenewAnOauthTokenMetadataParam): Promise<FetchResponse<200, types.CreateOrRenewAnOauthTokenResponse200>> {
    return this.core.fetch('/organizations/{organization}/oauth-applications/{id}/token', 'post', body, metadata);
  }

  /**
   * Endpoint is available without authentication.
   *
   *
   * @summary List public regions
   */
  listPublicRegions(metadata?: types.ListPublicRegionsMetadataParam): Promise<FetchResponse<200, types.ListPublicRegionsResponse200>> {
    return this.core.fetch('/regions', 'get', metadata);
  }

  /**
   * Get the user associated with this service token
   * ### Authorization
   * A   OAuth token must have at least one of the following   scopes in order to use this
   * API endpoint:
   *
   * **OAuth Scopes**
   *
   *  | Resource | Scopes |
   * | :------- | :---------- |
   * | User | `read_user` |
   *
   * @summary Get current user
   */
  getCurrentUser(): Promise<FetchResponse<200, types.GetCurrentUserResponse200>> {
    return this.core.fetch('/user', 'get');
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { CancelAQueuedDeployRequestMetadataParam, CancelAQueuedDeployRequestResponse200, CloseADeployRequestBodyParam, CloseADeployRequestMetadataParam, CloseADeployRequestResponse200, CompleteAGatedDeployRequestMetadataParam, CompleteAGatedDeployRequestResponse200, CompleteARevertMetadataParam, CompleteARevertResponse200, CompleteAnErroredDeployMetadataParam, CompleteAnErroredDeployResponse200, CreateABackupBodyParam, CreateABackupMetadataParam, CreateABackupResponse201, CreateABranchBodyParam, CreateABranchMetadataParam, CreateABranchResponse201, CreateADatabaseBodyParam, CreateADatabaseMetadataParam, CreateADatabaseResponse201, CreateADeployRequestBodyParam, CreateADeployRequestMetadataParam, CreateADeployRequestResponse201, CreateAPasswordBodyParam, CreateAPasswordMetadataParam, CreateAPasswordResponse201, CreateOrRenewAnOauthTokenBodyParam, CreateOrRenewAnOauthTokenMetadataParam, CreateOrRenewAnOauthTokenResponse200, DeleteABackupMetadataParam, DeleteABranchMetadataParam, DeleteADatabaseMetadataParam, DeleteAPasswordMetadataParam, DeleteAnOauthTokenMetadataParam, DemoteABranchMetadataParam, DemoteABranchResponse200, DisableSafeMigrationsForABranchMetadataParam, DisableSafeMigrationsForABranchResponse200, EnableSafeMigrationsForABranchMetadataParam, EnableSafeMigrationsForABranchResponse200, GetABackupMetadataParam, GetABackupResponse200, GetABranchMetadataParam, GetABranchResponse200, GetABranchSchemaMetadataParam, GetABranchSchemaResponse200, GetADatabaseMetadataParam, GetADatabaseResponse200, GetADeployRequestMetadataParam, GetADeployRequestResponse200, GetADeploymentMetadataParam, GetADeploymentResponse200, GetAPasswordMetadataParam, GetAPasswordResponse200, GetAnOauthApplicationMetadataParam, GetAnOauthApplicationResponse200, GetAnOauthTokenMetadataParam, GetAnOauthTokenResponse200, GetAnOrganizationMetadataParam, GetAnOrganizationResponse200, GetCurrentUserResponse200, GetTheDeployQueueMetadataParam, GetTheDeployQueueResponse200, LintABranchSchemaMetadataParam, LintABranchSchemaResponse200, ListBackupsMetadataParam, ListBackupsResponse200, ListBranchesMetadataParam, ListBranchesResponse200, ListDatabaseRegionsMetadataParam, ListDatabaseRegionsResponse200, ListDatabasesMetadataParam, ListDatabasesResponse200, ListDeployOperationsMetadataParam, ListDeployOperationsResponse200, ListDeployRequestReviewsMetadataParam, ListDeployRequestReviewsResponse200, ListDeployRequestsMetadataParam, ListDeployRequestsResponse200, ListOauthApplicationsMetadataParam, ListOauthApplicationsResponse200, ListOauthTokensMetadataParam, ListOauthTokensResponse200, ListOrganizationsMetadataParam, ListOrganizationsResponse200, ListPasswordsMetadataParam, ListPasswordsResponse200, ListPublicRegionsMetadataParam, ListPublicRegionsResponse200, ListReadOnlyRegionsMetadataParam, ListReadOnlyRegionsResponse200, ListRegionsForAnOrganizationMetadataParam, ListRegionsForAnOrganizationResponse200, PromoteABranchMetadataParam, PromoteABranchResponse200, QueueADeployRequestMetadataParam, QueueADeployRequestResponse200, RenewAPasswordMetadataParam, RenewAPasswordResponse200, ReviewADeployRequestBodyParam, ReviewADeployRequestMetadataParam, ReviewADeployRequestResponse201, SkipRevertPeriodMetadataParam, SkipRevertPeriodResponse200, UpdateAPasswordBodyParam, UpdateAPasswordMetadataParam, UpdateAPasswordResponse200, UpdateAnOrganizationBodyParam, UpdateAnOrganizationMetadataParam, UpdateAnOrganizationResponse200, UpdateAutoApplyForDeployRequestBodyParam, UpdateAutoApplyForDeployRequestMetadataParam, UpdateAutoApplyForDeployRequestResponse200, UpdateDatabaseSettingsBodyParam, UpdateDatabaseSettingsMetadataParam, UpdateDatabaseSettingsResponse200 } from './types';
