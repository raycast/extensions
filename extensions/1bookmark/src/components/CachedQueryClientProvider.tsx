import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getPreferenceValues, showToast, Toast } from '@raycast/api'
import { join } from 'node:path'
import { useState } from 'react'
import SuperJSON from 'superjson'
import fetch from 'node-fetch'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '../utils/trpc.util.js'
import { getSessionToken } from '@/states/session-token.state.js'
import axios from 'axios'

interface Preferences {
  apiUrl: string
}

if (!globalThis.fetch) {
  // @ts-expect-error 잘 동작하는 듯
  globalThis.fetch = fetch
}

// 나중에 Cache 사용할 필요가 있을 때.
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
  const [queryClient] = useState(() => new QueryClient())

  // sessionToken이 바뀔 때마다 trpcClient를 새로 만들오주고 싶은데,
  // 잘 안되서 일단은 매번 getSessionToken() 하는 구조로 변경.
  // TODO: 나중에 위에 기존 코드 기반으로 다시 한번 해보자.
  // https에서 쿠키 사용하는 문제가 섞여서 헷갈렸음.
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: join(getPreferenceValues<Preferences>().apiUrl, '/api/trpc'),
          transformer: SuperJSON,
          // headers: headers,
          async fetch(url, options) {
            const token = await getSessionToken()
            const headers = token
              ? {
                  ...options?.headers,
                  // key=value; Path=/; HttpOnly; Secure; SameSite=Lax
                  // 이런식으로 다 저장하고 있다.
                  Cookie: token,
                }
              : options?.headers

            try {
              const res = await axios({
                url: url as string,
                method: options?.method,
                data: options?.body,
                // signal: options?.signal!,
                headers: headers as any,
              })
              return {
                json: () => res.data,
              }
            } catch (err) {
              const msg = (err as any)?.response?.data?.[0]?.error?.json?.message
              console.log((err as any)?.response?.data?.[0]?.error?.json)
              showToast({
                style: Toast.Style.Failure,
                title: msg || 'Unknown API Error',
              })

              return {
                json: () => {
                  // 사용하는 쪽에서는 이렇게,
                  // console.log((error as TRPCClientError<AppRouter>).message)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.code)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.httpStatus)
                  // console.log((error as TRPCClientError<AppRouter>).shape?.data.path)
                  return (err as any)?.response?.data
                },
              }
            }
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>

    // 나중에 Cache 사용할 필요가 있을 때.
    // <trpc.Provider client={trpcClient} queryClient={queryClient}>
    //   <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
    //     {children}
    //   </PersistQueryClientProvider>
    // </trpc.Provider>
  )
}
