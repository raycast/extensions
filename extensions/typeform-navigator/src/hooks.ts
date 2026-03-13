import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { AnswersResponse, ErrorResponse, FormDefinition, FormOverview, InsightsResponse, Workspace } from "./dto";
const { personalToken, dataCenter } = getPreferenceValues<Preferences>();
const API_URL = dataCenter === "default" ? "https://api.typeform.com/" : "https://api.eu.typeform.com/";
const PAGE_SIZE = 10;
type PaginatedResult<T> = {
  items: T[];
  total_items: number;
  page_count: number;
};

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${personalToken}`,
};
const useTypeform = <T>(endpoint: string) =>
  useFetch<T>(API_URL + endpoint, {
    headers,
    async parseResponse(response: Response) {
      const isJson = response.headers.get("Content-Type")?.includes("application/json");
      if (!response.ok) {
        const error: ErrorResponse = isJson ? await response.json() : JSON.parse(await response.text());
        throw new Error(error.description);
      }
      return await response.json();
    },
  });
const useTypeformPaginated = <T>(endpoint: string, params?: Record<string, string>) =>
  useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({
        page: String(options.page + 1),
        page_size: String(PAGE_SIZE),
        ...params,
      }).toString(),
    {
      headers,
      async parseResponse(response: Response) {
        const isJson = response.headers.get("Content-Type")?.includes("application/json");
        if (!response.ok) {
          const error: ErrorResponse = isJson ? await response.json() : JSON.parse(await response.text());
          throw new Error(error.description);
        }
        const page = new URL(response.url).searchParams.get("page") ?? "0";
        const data: PaginatedResult<T> = await response.json();
        return {
          data,
          page,
        };
      },
      mapResult(result) {
        return {
          data: result.data.items,
          hasMore: Number(result.page) !== result.data.page_count,
        };
      },
      initialData: [],
    }
  );

export const useGetWorkspaces = () => useTypeformPaginated<Workspace>("workspaces");
export const useGetForms = (workspaceId: string) =>
  useTypeformPaginated<FormOverview>("forms", { workspace_id: workspaceId });

export const useGetForm = (formId: string) => useTypeform<FormDefinition>(`forms/${formId}`);
export const useGetFormInsights = (formId: string) => useTypeform<InsightsResponse>(`forms/${formId}/insights/metrics`);
export const useGetFormResponses = (formId: string) =>
  useTypeformPaginated<AnswersResponse>(`forms/${formId}/responses`);
