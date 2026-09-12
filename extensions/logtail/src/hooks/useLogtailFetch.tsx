import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { useFetch } from "@raycast/utils";
import { confirmAlert, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect } from "react";

export type UseLogtailFetchOptions = {
  url: string;
  execute?: boolean;
};

export type UseLogtailFetchResultWithRender<Response, Props> = {
  Render: UseLogtailFetchComponent<Response, Props>;
  response: UseCachedPromiseReturnType<Response, undefined>;
};
export type UseLogtailFetchResult<Response> = {
  response: UseCachedPromiseReturnType<Response, undefined>;
};

export type UseLogtailFetchRenderProps<Response> = UseCachedPromiseReturnType<Response, undefined>;
export type UseLogtailFetchComponent<Response, Props> = (
  props: Partial<UseLogtailFetchRenderProps<Response> & { additionalProps?: Props }>
) => React.ReactElement<unknown>;
export type UseLogtailFetchRenderFn<Response, Props> = (
  props: UseLogtailFetchRenderProps<Response> & { additionalProps?: Props }
) => React.ReactElement<unknown>;

export function useLogtailFetch<Response, Props = object>(
  opts: UseLogtailFetchOptions,
  render: UseLogtailFetchRenderFn<Response, Props>
): UseLogtailFetchResultWithRender<Response, Props>;
export function useLogtailFetch<Response>(opts: UseLogtailFetchOptions): UseLogtailFetchResult<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLogtailFetch<Response, Props = object>({ url, execute }: any, render?: any): any {
  const preferences = getPreferenceValues();

  const response = useFetch<Response>(url, {
    execute: !!preferences.logtailApiKey && (execute === undefined ? true : !!execute),
    headers: {
      Authorization: `Bearer ${preferences.logtailApiKey}`,
    },
  });

  const isInvalidApiKey = !!preferences.logtailApiKey && response.error?.message.includes("Unauthorized");

  useEffect(() => {
    if (isInvalidApiKey) {
      confirmAlert({
        title: "Invalid Logtail API Key",
        message: "Please set a valid Logtail API Key in the extension preferences.",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => {
            openExtensionPreferences();
          },
        },
      });
    }
  }, [isInvalidApiKey]);

  if (render) {
    const renderWrapper = ({ additionalProps }: { additionalProps?: Props }) =>
      render({ ...response, additionalProps });

    return { Render: renderWrapper, response };
  }

  return { response };
}
