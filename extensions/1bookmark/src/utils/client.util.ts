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
  // 세션이 서버에서 무효화된 경우(웹에서 세션 제거, 계정 탈퇴 등) 토큰과 함께
  // 로그인 상태를 정리한다. 토큰이 비워지면 use-logged-out-status.hook 이
  // 보안 민감 캐시(me/bookmarks/tags)를 즉시 클리어하고 로그인 뷰로 전환한다.
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

                    // 로그인된 상태에서 401(UNAUTHORIZED)을 받으면 세션이 서버에서
                    // 무효화된 것이므로 로그아웃 처리한다. 첫 에러가 다른 종류여도
                    // batch 안에 401이 섞여 있을 수 있으므로 전체를 검사한다.
                    const has401 = errors.some(
                      (e: { error: { json: { data?: { httpStatus?: number } } } }) =>
                        e.error.json.data?.httpStatus === 401,
                    );
                    if (has401 && token) {
                      console.error(`Session invalidated by server -> ${logDetail}`);
                      handleSessionExpired();
                      return res.data;
                    }

                    // 사용자에게는 서버가 내려준 사용자용 메시지만 보여주고, 라우터/상태코드는 로그에만 남긴다.
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
              const axiosErrorMessage = isAxiosError(err) ? `AxiosError [${err.stack?.split("\n")[0]}]` : "";
              const middlewareErrorMessage = (trpcError.response?.data as { middlewareErrorMessage?: string })
                ?.middlewareErrorMessage;

              // Session expired → clear token to redirect to login
              if (middlewareErrorMessage === "SESSION_EXPIRED") {
                console.error("Session expired - re-login required");
                handleSessionExpired();
                return { ok: false, json: async () => trpcError.response?.data };
              }

              // 로그인된 상태에서 401(UNAUTHORIZED)을 받으면 세션이 서버에서
              // 무효화된 것(웹에서 세션 제거, 계정 탈퇴 등)이므로 로그아웃 처리한다.
              // Bearer 토큰 경로는 middleware를 통과하므로 SESSION_EXPIRED 분기를 타지 않는다.
              // HTTP 상태가 다른 에러(예: 500)여도 batch 응답 안에 401이 섞여 있을 수 있어 함께 검사한다.
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

              // 사용자에게는 서버가 내려준 사용자용 메시지만 보여주고, 라우터/상태코드는 로그에만 남긴다.
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
