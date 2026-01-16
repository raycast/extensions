import { QueryClient } from "@tanstack/react-query";
import { trpc } from "./trpc.util.js";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";
import { API_URL_TRPC } from "./constants.util.js";
import axios, { isAxiosError } from "axios";
import { showFailureToast } from "@raycast/utils";

interface TRPCError {
  response?: {
    data?: Array<{
      error?: {
        json?: {
          message?: string;
        };
      };
    }>;
    status?: number;
  };
}

let token = "";

let queryClientSingleton: QueryClient | undefined = undefined;
let trpcClientSingleton: ReturnType<typeof trpc.createClient> | undefined = undefined;

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
                  // key=value; Path=/; HttpOnly; Secure; SameSite=Lax
                  // like above, all cookie information is stored.
                  Cookie: token,
                }
              : options?.headers;

            try {
              const res = await axios({
                url: url as string,
                method: options?.method,
                data: options?.body,
                // signal: options?.signal!,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                headers: headers as any,
              });

              const setCookieHeaders = res?.headers?.["set-cookie"];
              const sessionTokenLine = setCookieHeaders?.find((header: string) =>
                header.includes("authjs.session-token="),
              );
              if (sessionTokenLine) {
                // Update session token.
                // If used before expiration, it will be extended.
                setSessionToken(sessionTokenLine);
              }

              return {
                json: () => {
                  const errorIdx = res.data.findIndex((item: { error: { json: { message: string } } }) => item.error);
                  const errors = res.data.filter((item: { error: { json: { message: string } } }) => item.error);
                  if (errors.length > 0) {
                    // Since this is a batch request, some requests may fail while others succeed. (207 response)
                    // In this case, we show the first error that occurred.
                    const error = errors[0];
                    const errorRouterName = (url as string).split("?")[0].split("/").pop()?.split(",")[errorIdx];
                    const errorMessage = error.error.json.message || "Unknown API Error";
                    const httpStatus = error.error.json.data.httpStatus;
                    const title = `${errorRouterName}: ${errorMessage} (${httpStatus})`;

                    showFailureToast(new Error(`tRPC error in batch results -> ${title}`), { title });
                    console.error("tRPC Error(batch):");
                    console.error(title);
                  }
                  return res.data;
                },
              };
            } catch (err) {
              // When a single request fails, the error gets caught here.
              const trpcError = err as TRPCError;
              const errorRouterName = (url as string).split("?")[0].split("/").pop()?.split(",")[0];
              const axiosErrorMessage = isAxiosError(err) ? `AxiosError [${err.stack?.split("\n")[0]}]` : "";
              const middlewareErrorMessage = (trpcError.response?.data as { middlewareErrorMessage?: string })
                ?.middlewareErrorMessage;
              const errorMessage =
                trpcError.response?.data?.[0]?.error?.json?.message ||
                middlewareErrorMessage ||
                axiosErrorMessage ||
                "Unknown API Error";
              const httpStatus = trpcError.response?.status;
              const routerName = middlewareErrorMessage ? "Middleware" : errorRouterName;
              const title = `${routerName}: ${errorMessage} (${httpStatus})`;

              (err as Error).message = (err as Error).message + ` -> ${title}`;
              showFailureToast(err, { title });
              console.error("tRPC Error:");
              console.error(title);

              return {
                json: () => {
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
