import { QueryClient } from "@tanstack/react-query";
import { trpc } from "./trpc.util.js";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";
import { API_URL_TRPC } from "./constants.util.js";
import axios from "axios";
import { showToast, Toast } from "@raycast/api";

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
                json: () => res.data,
              };
            } catch (err) {
              const trpcError = err as TRPCError;
              const msg = trpcError.response?.data?.[0]?.error?.json?.message;
              console.log("err:");
              console.log(err);
              console.log("tRPC Error:");
              console.log(trpcError.response?.data?.[0]?.error?.json);
              showToast({
                style: Toast.Style.Failure,
                title: msg ? msg : trpcError.response?.status === 401 ? "Login Required" : "Unknown API Error",
              });

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
