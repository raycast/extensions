import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import https from "https";
import FormData from "form-data";
import { Collection, NewRequest, ResponseData, Request } from "~/types";
import { getValueByPath, resolveVariables, substitutePlaceholders } from "./environment-utils";
import { handleSetCookieHeaders, prepareCookieHeader } from "./cookie-utils";
import { $isHistoryEnabled } from "~/store/settings";
import { addHistoryEntry } from "~/store/history";
import { saveVariableToActiveEnvironment } from "~/store/environments";
import { getPreferenceValues } from "@raycast/api";

export const headersArrayToObject = (headers: { key: string; value: string }[]) => {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
};

export function prepareRequest(request: NewRequest, collection: Collection, variables: Record<string, string>) {
  const finalUrl = substitutePlaceholders(request.url, variables) ?? "";

  // Substitute placeholders in COLLECTION headers
  const collectionHeaders =
    collection.headers?.map(({ key, value }) => ({
      key: substitutePlaceholders(key, variables) ?? "",
      value: substitutePlaceholders(value, variables) ?? "",
    })) ?? [];

  const headers =
    request.headers?.map(({ key, value }) => ({
      key: substitutePlaceholders(key, variables) ?? "",
      value: substitutePlaceholders(value, variables) ?? "",
    })) ?? [];

  const finalBody = substitutePlaceholders(request.body, variables);
  const finalParams = substitutePlaceholders(request.params, variables);
  const finalGqlQuery = substitutePlaceholders(request.query, variables);
  const finalGqlVariables = substitutePlaceholders(request.variables, variables);

  const cookieHeader = prepareCookieHeader(finalUrl);
  const finalHeaders: Record<string, string> = {
    ...cookieHeader,
    ...headersArrayToObject(collectionHeaders),
    ...headersArrayToObject(headers),
  };

  return { finalBody, finalParams, finalGqlQuery, finalGqlVariables, finalHeaders, finalUrl };
}

function buildAxiosConfig(request: NewRequest, preparedData: ReturnType<typeof prepareRequest>): AxiosRequestConfig {
  const { finalUrl, finalBody, finalHeaders, finalParams, finalGqlQuery, finalGqlVariables } = preparedData;

  const { disableSSLVerification } = getPreferenceValues<{ disableSSLVerification: boolean }>();

  const config: AxiosRequestConfig = {
    url: finalUrl,
    headers: finalHeaders,
    method: request.method === "GRAPHQL" ? "POST" : request.method,
    params: finalParams ? JSON.parse(finalParams) : undefined,
    data: finalBody ? JSON.parse(finalBody) : undefined,
    httpsAgent: disableSSLVerification ? new https.Agent({ rejectUnauthorized: false }) : undefined,
  };

  if (request.bodyType === "FORM_DATA" && finalBody) {
    const formData = new FormData();
    const dataObject: Record<string, string> = JSON.parse(finalBody);
    for (const [key, value] of Object.entries(dataObject)) {
      formData.append(key, value);
    }
    config.data = formData;
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  if (request.method === "GRAPHQL") {
    config.data = {
      query: finalGqlQuery,
      variables: finalGqlVariables ? JSON.parse(finalGqlVariables) : undefined,
    };
  }

  return config;
}

// This function handles all the "post-flight" logic after a response is received.
async function processResponse(request: NewRequest, response: AxiosResponse) {
  handleSetCookieHeaders(response);

  if (request.responseActions) {
    for (const action of request.responseActions) {
      let extractedValue: unknown;

      if (action.source === "BODY_JSON") {
        // Use `get` to safely access a value from a nested path
        extractedValue = getValueByPath(response.data, action.sourcePath);
      } else if (action.source === "HEADER") {
        extractedValue = response.headers[action.sourcePath.toLowerCase()];
      }

      if (typeof extractedValue === "string" || typeof extractedValue === "number") {
        if (action.storage === "ENVIRONMENT") {
          await saveVariableToActiveEnvironment(action.variableKey, String(extractedValue));
        }
      }
    }
  }

  if ($isHistoryEnabled.get()) {
    const responseData: ResponseData = {
      requestMethod: request.method,
      requestUrl: response.config.url ?? request.url,
      status: response.status,
      statusText: response.statusText,
      headers: { ...response.headers } as Record<string, string>,
      body: response.data,
    };
    await addHistoryEntry(request, responseData, "id" in request ? (request as Request).id : undefined);
  }
}

// --- THE REFACTORED MAIN FUNCTION ---
export async function runRequest(
  request: NewRequest,
  collection: Collection,
  temporaryVariables?: Record<string, string>,
  signal?: AbortSignal,
) {
  // 1. PREPARE VARIABLES
  const envVars = resolveVariables();
  const allVars = { ...envVars, ...temporaryVariables };

  // 2. PREPARE REQUEST
  const preparedRequest = prepareRequest(request, collection, allVars);

  // 3. EXECUTE
  try {
    const config = buildAxiosConfig(request, preparedRequest);

    if (signal) {
      config.signal = signal;
    }

    const response = await axios(config);

    // 4. PROCESS on success
    await processResponse(request, response);

    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // 3. PROCESS on failure (still process cookies and save to history)
      await processResponse(request, error.response);
    }
    throw error;
  }
}
