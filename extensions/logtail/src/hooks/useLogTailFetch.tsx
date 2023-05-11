import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { UseLogTailTokenResult, useLogTailToken } from "./useLogTailToken";
import { useFetch } from "@raycast/utils";
import SetToken from "../configure";

export type LogTailFetchOptions = {
  url: string;
  execute?: boolean;
};

export type LogTailFetchResponse<Response> = UseCachedPromiseReturnType<Response, undefined> & {
  tokenData: UseLogTailTokenResult;
};
export type UseLogTailFetchResult<Response, Props> = [
  UseLogTailFetchComponent<Response, Props> | null,
  LogTailFetchResponse<Response>
];
export type UseLogTailFetchRenderProps<Response> = LogTailFetchResponse<Response>;
export type UseLogTailFetchComponent<Response, Props> = (
  props: Partial<UseLogTailFetchRenderProps<Response> & { additionalProps?: Props }>
) => React.ReactElement<unknown>;
export type UseLogTailFetchRenderFn<Response, Props> = (
  props: UseLogTailFetchRenderProps<Response> & { additionalProps?: Props }
) => React.ReactElement<unknown>;

export function useLogTailFetch<Response, Props = object>(
  { url, execute }: LogTailFetchOptions,
  render?: UseLogTailFetchRenderFn<Response, Props>
): UseLogTailFetchResult<Response, Props> {
  const tokenData = useLogTailToken();
  const res = useFetch<Response>(url, {
    execute: !!tokenData.token && (execute === undefined ? true : !!execute),
    headers: {
      Authorization: `Bearer ${tokenData.token}`,
    },
  });

  const handleSubmitToken = async () => {
    tokenData.mutate();
  };

  const result = { ...res, tokenData } as LogTailFetchResponse<Response>;

  if (!tokenData.token && !tokenData.isTokenLoading) {
    return [() => <SetToken onSubmit={handleSubmitToken} />, result];
  }

  if (render) {
    return [({ additionalProps }: { additionalProps?: Props }) => render({ ...result, additionalProps }), result];
  }

  return [null, result];
}
