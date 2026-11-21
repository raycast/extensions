import {
  Configuration,
  CyclesApi,
  LabelsApi,
  ModulesApi,
  ProjectsApi,
  StatesApi,
  UsersApi,
  WorkItemsApi,
  MembersApi,
  WorkItemTypesApi,
  WorkItemCommentsApi,
  type Middleware,
} from "@makeplane/plane-node-sdk";
import { getApiBasePath } from "../helpers/urls";
import { PlaneApiError } from "../helpers/plane-api-error";
import { extractErrorMessage, parseRetryAfter } from "../helpers/problem";

/**
 * The SDK throws a bare `ResponseError("Response returned an error code")` for non-2xx responses, which hides
 * Plane's reason (e.g. "Given API token is not valid"). Throw a `PlaneApiError` with the body's detail instead.
 */
export const errorDetailMiddleware: Middleware = {
  post: async ({ url, response }) => {
    if (response.ok) return response;
    const text = await response
      .clone()
      .text()
      .catch(() => "");
    let body: unknown = text || undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // Not JSON; keep the text.
    }
    const message = extractErrorMessage(body) ?? (response.statusText || `HTTP ${response.status}`);
    throw new PlaneApiError(response.status, message, url, body, {
      retryAfter: parseRetryAfter(response.headers.get("retry-after")),
    });
  },
};

export class PlaneClient {
  accessToken: string;
  apiKey: string;
  config: Configuration;
  workspaceSlug: string;
  workItemsApi: WorkItemsApi;
  workItemTypesApi: WorkItemTypesApi;
  workItemCommentsApi: WorkItemCommentsApi;
  projectsApi: ProjectsApi;
  labelsApi: LabelsApi;
  statesApi: StatesApi;
  usersApi: UsersApi;
  membersApi: MembersApi;
  modulesApi: ModulesApi;
  cyclesApi: CyclesApi;

  constructor(workspaceSlug: string, accessToken?: string, apiKey?: string) {
    this.accessToken = accessToken || "";
    this.apiKey = apiKey || "";
    this.config = new Configuration({
      ...(accessToken ? { accessToken } : {}),
      ...(apiKey ? { apiKey } : {}),
      basePath: getApiBasePath(),
      middleware: [errorDetailMiddleware],
    });

    this.workspaceSlug = workspaceSlug;
    this.workItemsApi = new WorkItemsApi(this.config);
    this.workItemTypesApi = new WorkItemTypesApi(this.config);
    this.workItemCommentsApi = new WorkItemCommentsApi(this.config);
    this.projectsApi = new ProjectsApi(this.config);
    this.labelsApi = new LabelsApi(this.config);
    this.statesApi = new StatesApi(this.config);
    this.usersApi = new UsersApi(this.config);
    this.membersApi = new MembersApi(this.config);
    this.modulesApi = new ModulesApi(this.config);
    this.cyclesApi = new CyclesApi(this.config);
  }

  /** Auth headers for raw `fetch` calls, matching what the SDK sends. */
  getAuthHeaders(): Record<string, string> {
    if (this.apiKey) return { "X-API-Key": this.apiKey };
    if (this.accessToken) return { Authorization: `Bearer ${this.accessToken}` };
    return {};
  }
}
