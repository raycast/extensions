import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import SuperJSON from "superjson";
import fetch from "node-fetch";
import { httpBatchLink } from "@trpc/client";
import axios from "axios";
import { useAtom } from "jotai";
import { trpc } from "../utils/trpc.util.js";
import { getSessionToken, sessionTokenAtom } from "../states/session-token.state";
import { API_URL_TRPC } from "../utils/constants.util.js";

if (!globalThis.fetch) {
  // @ts-expect-error It works well.
  globalThis.fetch = fetch;
}

// For later when we need to use Cache
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       retry: false,
//       gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
//     },
//   },
// });
// interface AsyncStorage {
//   getItem: (key: string) => Promise<string | null>;
//   setItem: (key: string, value: string) => Promise<unknown>;
//   removeItem: (key: string) => Promise<void>;
// }
// const Storage: AsyncStorage = {
//   getItem: async (key: string) => {
//     return (await LocalStorage.getItem<string>(key)) ?? null;
//   },
//   setItem: async (key: string, value: string) => {
//     return await LocalStorage.setItem(key, value);
//   },
//   removeItem: async (key: string) => {
//     return await LocalStorage.removeItem(key);
//   },
// };
// const asyncStoragePersister = createAsyncStoragePersister({
//   storage: Storage,
// });

// const getClient = () => {
//   return trpc.createClient({
//     links: [
//       httpBatchLink({
//         url: join(getPreferenceValues<Preferences>().apiUrl, '/api/trpc'),
//         transformer: SuperJSON,
//         headers: async () => {
//           const token = await getSessionToken()
//           return {
//             'Cookie': `authjs.session-token=${token}`
//           }
//         },
//       })
//     ]
//   })
// }

export function CachedQueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // staleTime: ms('1m'),
            // gcTime: ms('30d'),
          },
        },
      }),
  );

  const [, setSessionToken] = useAtom(sessionTokenAtom);

  // Want to recreate trpcClient whenever sessionToken changes,
  // But it wasn't working well, so changed to getSessionToken() every time.
  // TODO: Try again later based on the previous code.
  // Previous try got confused with cookie usage in https.
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: API_URL_TRPC,
          transformer: SuperJSON,
          // headers: headers,
          async fetch(url, options) {
            const token = await getSessionToken();
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const msg = (err as any)?.response?.data?.[0]?.error?.json?.message;
              console.log("rTRPC Error: ");
              console.log(err);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              console.log((err as any)?.response?.data?.[0]?.error?.json);
              showToast({
                style: Toast.Style.Failure,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                title: msg ? msg : (err as any)?.response?.status === 401 ? "Login Required" : "Unknown API Error",
              });

              return {
                json: () => {
                  // error can be used in the following way.
                  // console.log((error as TRPCClientError<AppRouter>).message)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.code)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.httpStatus)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.path)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  return (err as any)?.response?.data;
                },
              };
            }
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>

    // For later when we need to use Cache
    // <trpc.Provider client={trpcClient} queryClient={queryClient}>
    //   <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
    //     {children}
    //   </PersistQueryClientProvider>
    // </trpc.Provider>
  );
}
