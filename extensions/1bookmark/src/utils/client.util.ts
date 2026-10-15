import { QueryClient } from "@tanstack/react-query";
import { trpc } from "./trpc.util.js";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";
import { API_URL_TRPC } from "./constants.util.js";
import axios, { isAxiosError } from "axios";
import { showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";

interface TRPCError {
  response?: {
    data?: Array<{
      error?: {
        json?: {
          message?: string;
          data?: {
            httpStatus?: number;
          };
        };
      };
    }>;
    status?: number;
  };
}

let token = "";
let lastNetworkToastAt = 0;

let queryClientSingleton: QueryClient | undefined = undefined;
let trpcClientSingleton: ReturnType<typeof trpc.createClient> | undefined = undefined;

const API_TIMEOUT_MS = 15_000;
const NETWORK_ERROR_CODES = new Set([
  "ERR_NETWORK",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
]);

const isNetworkUnavailableError = (error: unknown) => {
  if (!isAxiosError(error)) return false;

  // Axios only omits response when the request never reached an HTTP response
  // (offline, DNS, connection refusal/reset, or timeout).
  return !error.response || (error.code ? NETWORK_ERROR_CODES.has(error.code) : false);
};

const showNetworkUnavailableToast = () => {
  const now = Date.now();
  if (now - lastNetworkToastAt < 15_000) return;

  lastNetworkToastAt = now;
  showToast({
    style: Toast.Style.Failure,
    title: "Connection Unavailable",
    message: "Showing cached data. Connect to the internet to refresh.",
  });
};

export const getQueryClient = () => {
  if (!queryClientSingleton) {
    queryClientSingleton = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClientSingleton;
};

export const setToken = (pToken: string) => {
  token = pToken;
};

export const getTrpcClient = (setSessionToken: (sessionToken: string) => void) => {
  // When the session is invalidated by the server (session removed on the web, account deleted, etc.),
  // clear the token along with the login state. Once the token is emptied, use-logged-out-status.hook
  // immediately clears security-sensitive caches (me/bookmarks/tags) and switches to the login view.
  const handleSessionExpired = () => {
    setToken("");
    setSessionToken("");
    showFailureToast(new Error("Session has expired"), {
      title: "Session Expired",
      message: "Please login again",
    });
  };

  if (!trpcClientSingleton) {
    trpcClientSingleton = trpc.createClient({
      links: [
        httpBatchLink({
          url: API_URL_TRPC,
          transformer: SuperJSON,
          async fetch(url, options) {
            const headers = token
              ? {
                  ...options?.headers,
                  Authorization: `Bearer ${token}`,
                }
              : options?.headers;

            try {
              const res = await axios({
                url: url as string,
                method: options?.method,
                data: options?.body,
                timeout: API_TIMEOUT_MS,
                // signal: options?.signal!,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                headers: headers as any,
              });

              return {
                ok: true,
                json: async () => {
                  const errorIdx = res.data.findIndex((item: { error: { json: { message: string } } }) => item.error);
                  const errors = res.data.filter((item: { error: { json: { message: string } } }) => item.error);
                  if (errors.length > 0) {
                    // Since this is a batch request, some requests may fail while others succeed. (207 response)
                    // In this case, we show the first error that occurred.
                    const error = errors[0];
                    const errorRouterName = (url as string).split("?")[0].split("/").pop()?.split(",")[errorIdx];
                    const errorMessage = error.error.json.message || "Unknown API Error";
                    const httpStatus = error.error.json.data.httpStatus;
                    const logDetail = `${errorRouterName}: ${errorMessage} (${httpStatus})`;

                    // Receiving a 401 (UNAUTHORIZED) while logged in means the session was
                    // invalidated by the server, so log out. Even if the first error is of a
                    // different kind, a 401 may be mixed into the batch, so check all of them.
                    const has401 = errors.some(
                      (e: { error: { json: { data?: { httpStatus?: number } } } }) =>
                        e.error.json.data?.httpStatus === 401,
                    );
                    if (has401 && token) {
                      console.error(`Session invalidated by server -> ${logDetail}`);
                      handleSessionExpired();
                      return res.data;
                    }

                    // Show the user only the server's user-facing message; router/status code go to the log only.
                    showFailureToast(new Error(`tRPC error in batch results -> ${logDetail}`), { title: errorMessage });
                    console.error("tRPC Error(batch):");
                    console.error(logDetail);
                  }
                  return res.data;
                },
              };
            } catch (err) {
              // When a single request fails, the error gets caught here.
              const trpcError = err as TRPCError;
              const errorRouterName = (url as string).split("?")[0].split("/").pop()?.split(",")[0];

              if (isNetworkUnavailableError(err)) {
                const networkError = err as Error & { code?: string };
                showNetworkUnavailableToast();
                console.warn(
                  `tRPC network unavailable -> ${errorRouterName} (${networkError.code || networkError.name})`,
                );

                return { ok: false, json: async () => undefined };
              }

              const axiosErrorMessage = isAxiosError(err) ? `AxiosError [${err.stack?.split("\n")[0]}]` : "";
              const middlewareErrorMessage = (trpcError.response?.data as { middlewareErrorMessage?: string })
                ?.middlewareErrorMessage;

              // Session expired → clear token to redirect to login
              if (middlewareErrorMessage === "SESSION_EXPIRED") {
                console.error("Session expired - re-login required");
                handleSessionExpired();
                return { ok: false, json: async () => trpcError.response?.data };
              }

              // Receiving a 401 (UNAUTHORIZED) while logged in means the session was invalidated
              // by the server (session removed on the web, account deleted, etc.), so log out.
              // The Bearer token path passes through the middleware, so it never hits the SESSION_EXPIRED branch.
              // Even with a different HTTP status (e.g. 500), a 401 may be mixed into the batch response, so check it.
              const dataErrors = Array.isArray(trpcError.response?.data) ? trpcError.response.data : [];
              const has401 =
                trpcError.response?.status === 401 || dataErrors.some((e) => e?.error?.json?.data?.httpStatus === 401);
              if (has401 && token) {
                console.error(`Session invalidated by server -> ${errorRouterName} (401)`);
                handleSessionExpired();
                return { ok: false, json: async () => trpcError.response?.data };
              }

              const errorMessage =
                trpcError.response?.data?.[0]?.error?.json?.message ||
                middlewareErrorMessage ||
                axiosErrorMessage ||
                "Unknown API Error";
              const httpStatus = trpcError.response?.status;
              const routerName = middlewareErrorMessage ? "Middleware" : errorRouterName;
              const logDetail = `${routerName}: ${errorMessage} (${httpStatus})`;

              // Show the user only the server's user-facing message; router/status code go to the log only.
              (err as Error).message = (err as Error).message + ` -> ${logDetail}`;
              showFailureToast(err, { title: errorMessage });
              console.error("tRPC Error:");
              console.error(logDetail);

              return {
                ok: false,
                json: async () => {
                  // error can be used in the following way.
                  // console.log((error as TRPCClientError<AppRouter>).message)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.code)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.httpStatus)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.path)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  return trpcError.response?.data;
                },
              };
            }
          },
        }),
      ],
    });
  }
  return trpcClientSingleton;
};
