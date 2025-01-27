import { Toast } from "@raycast/api";
import axios, { AxiosError, AxiosResponse } from "axios";
import curlString, { CurlStringOptions } from "curl-string";
import { Header } from "../types/headers";
import { Request, RequestMethodType, RequestProtocolType, Requests } from "../types/request";
import { Response } from "../types/response";
import { isJson } from "./storage";

export type AddResponse = (response: Response) => void;

export type SendRequestOptions = { addResponse?: AddResponse; toast?: Toast; rethrow?: boolean };

export type UseRequestsHelpersFactoryOptions = {
  requests?: Requests;
  setRequests: React.Dispatch<React.SetStateAction<Requests>>;
};

export type RequestHelpers = {
  sendRequest: (options?: { save?: boolean; toast?: Toast; rethrow?: boolean }) => Promise<Response>;
  addResponse: AddResponse;
  removeResponse: (response: Pick<Response, "created">) => void;
  favoriteRequest: () => void;
  unfavoriteRequest: () => void;
  tocURL: (curlStringOptions?: CurlStringOptions) => string;
};

export type UseRequestHelpersFactory = (request?: Request) => RequestHelpers;

const EMPTY_HELPERS: RequestHelpers = {
  sendRequest: async () => ({}) as Response,
  addResponse: () => {},
  removeResponse: () => {},
  favoriteRequest: () => {},
  unfavoriteRequest: () => {},
  tocURL: () => "",
};

function formatAxiosResponse(response: AxiosResponse): Response {
  return {
    status: {
      code: response.status,
      message: response.statusText,
    },
    body: typeof response.data === "string" ? response.data : JSON.stringify(response.data),
    headers: Object.fromEntries(Object.entries(response.headers)),
    created: new Date(),
  };
}

/* eslint-disable no-param-reassign */

export async function sendRequest(
  request: Request,
  { addResponse, toast, rethrow }: SendRequestOptions = {},
): Promise<Response> {
  try {
    const axiosResponse = await axios(request.url.toString(), {
      method: request.details.method,
      headers: request.details.headers,
    });

    const response = formatAxiosResponse(axiosResponse);

    if (toast !== undefined) {
      toast.style = Toast.Style.Success;
      toast.title = "Sent request";
    }

    if (addResponse) {
      addResponse(response);
    }

    return response;
  } catch (rawError) {
    const error = rawError as AxiosError;

    if (toast !== undefined) {
      if (!error.response) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to send request";
        toast.message = error.message;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Sent request with error";
      }
    }

    if (addResponse && error.response) {
      addResponse(formatAxiosResponse(error.response));
    }

    if (rethrow) {
      throw error;
    }

    return {} as Response;
  }
}

export function getRequestsHelpersFactory({
  requests,
  setRequests,
}: UseRequestsHelpersFactoryOptions): UseRequestHelpersFactory {
  if (requests === undefined) {
    return () => EMPTY_HELPERS;
  }

  return (request) => {
    if (request === undefined) {
      return EMPTY_HELPERS;
    }

    const setIsFavorite = (isStarred: boolean) =>
      setRequests((previous) => {
        const updatedRequests = { ...previous };

        updatedRequests[request.id] = {
          ...request,
          favorite: isStarred,
        };

        return updatedRequests;
      });

    const addResponse: AddResponse = (response) => {
      setRequests((previous) => {
        const updatedRequests = { ...previous };

        const updatedRequest = { ...request };
        updatedRequest.responses = [...updatedRequest.responses, response].sort(
          (a, b) => b.created.getTime() - a.created.getTime(),
        );

        updatedRequests[request.id] = updatedRequest;

        return updatedRequests;
      });
    };

    return {
      async sendRequest({ save = true, toast, rethrow = false } = {}) {
        return sendRequest(request, {
          addResponse: save ? addResponse : undefined,
          toast,
          rethrow,
        });
      },
      addResponse,
      removeResponse(response) {
        setRequests((previous) => {
          const updatedRequests = { ...previous };

          const updatedRequest = { ...request };
          updatedRequest.responses = updatedRequest.responses.filter(
            (existingResponse) => existingResponse.created !== response.created,
          );

          updatedRequests[request.id] = updatedRequest;

          return updatedRequests;
        });
      },
      favoriteRequest() {
        setIsFavorite(true);
      },
      unfavoriteRequest() {
        setIsFavorite(false);
      },
      tocURL(curlStringOptions?: CurlStringOptions) {
        return curlString(
          request.url.toString(),
          {
            method: request.details.method.toUpperCase(),
            headers: request.details.headers,
            body: request.details.body && isJson(request.details.body) ? JSON.parse(request.details.body) : undefined,
          },
          curlStringOptions,
        );
      },
    };
  };
}

/* eslint-enable no-param-reassign */

export type UseRequestOptions = {
  requestId: Request["id"];
} & UseRequestsHelpersFactoryOptions;

export type UseRequestHelpers = {
  request?: Request;
} & RequestHelpers;

export function getRequestHelpers({ requestId, requests, setRequests }: UseRequestOptions): UseRequestHelpers {
  const request = requests?.[requestId];
  const helpersFactory = getRequestsHelpersFactory({ requests, setRequests });

  return {
    request,
    ...helpersFactory(request),
  };
}

export function getUrlDetails(
  method: RequestMethodType,
  url: URL,
  headers: Record<string, Header>,
  body: string,
): Request["details"] {
  return {
    method,
    protocol: url.protocol as RequestProtocolType,
    hostname: url.hostname,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: Object.entries(headers).reduce((accumulator, [, { key, value }]) => {
      if (key === "" || value === "") {
        return accumulator;
      }

      return {
        ...accumulator,
        [key]: value,
      };
    }, {}),
    ...(body !== "" ? { body } : {}),
  };
}
