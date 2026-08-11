import { showToast, Toast, useNavigation } from "@raycast/api";
import axios from "axios";
import { useRef, useState } from "react";
import z from "zod";
import { saveVariableToActiveEnvironment } from "~/store/environments";
import { requestSchema, type Collection, type Request } from "~/types";
import { getValueByPath, runRequest } from "~/utils";
import { ErrorDetail } from "~/views/error-view";
import { ResponseView } from "~/views/response";

export function useRunRequest() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      void showToast({
        style: Toast.Style.Success,
        title: "Request Cancelled",
      });
    }
  };

  const execute = async (request: Request, collection: Collection) => {
    // Validate before running request
    const validationResult = requestSchema.safeParse(request);
    if (!validationResult.success) {
      push(<ErrorDetail error={validationResult.error} />);
      return;
    }
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running request..." });
    try {
      if (!collection) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No collection selected",
        });
        return;
      }

      // ✨ Temporary variable context for this request chain
      const temporaryVariables: Record<string, string> = {};

      // Run pre-request actions first
      if (request.preRequestActions && request.preRequestActions.length > 0) {
        const enabledPreRequests = request.preRequestActions.filter((a) => a.enabled);

        for (const preRequestAction of enabledPreRequests) {
          if (abortControllerRef.current?.signal.aborted) {
            return;
          }
          const preRequest = collection.requests.find((r) => r.id === preRequestAction.requestId);

          if (preRequest) {
            console.log(`Running pre-request: ${preRequest.title || preRequest.url}`);
            toast.message = `Running pre-request: ${preRequest.title || preRequest.url}`;

            // Run the pre-request with current temporary variables
            const response = await runRequest(
              preRequest,
              collection,
              temporaryVariables,
              abortControllerRef.current.signal,
            );

            // Extract variables from pre-request response
            if (preRequest.responseActions) {
              for (const action of preRequest.responseActions) {
                let extractedValue: unknown;

                if (action.source === "BODY_JSON") {
                  extractedValue = getValueByPath(response.data, action.sourcePath);
                } else if (action.source === "HEADER") {
                  extractedValue = response.headers[action.sourcePath.toLowerCase()];
                }

                if (typeof extractedValue === "string" || typeof extractedValue === "number") {
                  const valueStr = String(extractedValue);

                  // ✨ Store based on storage preference
                  if (action.storage === "ENVIRONMENT") {
                    // Save to environment (persistent)
                    await saveVariableToActiveEnvironment(action.variableKey, valueStr);
                  } else {
                    // Store temporarily (only for this request chain)
                    temporaryVariables[action.variableKey] = valueStr;
                  }
                }
              }
            }
            // Brief delay between pre-requests to allow UI updates and prevent server overload
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
      // Check if cancelled before main request
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const response = await runRequest(request, collection, temporaryVariables, abortControllerRef.current.signal);

      void toast.hide();
      if (!response) throw response;
      push(
        <ResponseView
          sourceRequestId={request.id}
          requestSnapshot={request}
          response={{
            requestMethod: request.method,
            requestUrl: response.config.url ?? "",
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, string>,
            body: response.data,
          }}
        />,
      );
    } catch (error) {
      // Check if it's an Axios error with a response from the server
      if (axios.isAxiosError(error) && error.response) {
        // This is an API error (e.g., 404, 500). Show the detailed view.
        void toast.hide();
        push(
          <ResponseView
            requestSnapshot={request}
            response={{
              requestMethod: request.method,
              requestUrl: error.response.config.url ?? request.url,
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers as Record<string, string>,
              body: error.response.data,
            }}
          />,
        );
      } else if (error instanceof z.ZodError) {
        void toast.hide();
        push(<ErrorDetail error={error} />);
      } else if (axios.isAxiosError(error) && error.code === "ENOTFOUND") {
        // DNS error
        toast.style = Toast.Style.Failure;
        toast.title = "Host Not Found";
        toast.message = "Check your internet or VPN connection.";
      } else if (axios.isAxiosError(error) && error.code === "ECONNREFUSED") {
        // Connection refused - server not running
        toast.style = Toast.Style.Failure;
        toast.title = "Connection Refused";
        toast.message = "The server is not responding. Check if it's running.";
      } else if (axios.isAxiosError(error) && error.code === "ETIMEDOUT") {
        // Timeout
        toast.style = Toast.Style.Failure;
        toast.title = "Request Timeout";
        toast.message = "The server took too long to respond.";
      } else if (axios.isAxiosError(error)) {
        // Other Axios errors - show the error code/message
        toast.style = Toast.Style.Failure;
        toast.title = "Request Failed";
        toast.message = error.code ? `${error.code}: ${error.message}` : error.message;
      } else {
        // Unknown error
        toast.style = Toast.Style.Failure;
        toast.title = "Request Failed";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };
  return { execute, isLoading, cancel };
}
