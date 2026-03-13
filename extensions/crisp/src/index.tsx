import { Action, ActionPanel, Cache, Color, Detail, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import ColorHash from "color-hash";

import { formatDistanceToNow } from "date-fns";

import { fetch, Headers } from "undici";
import { createClient } from "./generated/client";

import useSWR, { SWRConfig } from "swr";
import { getSupabaseWithSession, supabaseRef } from "./supabase-raycast";

// required to make Hono client work
globalThis.Headers = Headers;

const backendUrl = "https://crispyraycast.com";

const cache = new Cache();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const swrCache = new Map<string, any>(JSON.parse(cache.get("swr") || "[]"));

export default function Wrapper() {
  return (
    <SWRConfig
      value={{
        provider: () => swrCache,
        onSuccess() {
          setTimeout(() => cache.set("swr", JSON.stringify([...swrCache])));
        },
        onError(error) {
          showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
        },
      }}
    >
      <Command />
    </SWRConfig>
  );
}

const initialScreen = `
# Welcome to Crispy Raycast

Do you already have installed the Crisp plugin? This extension works by installing a Crisp plugin on each website you want to control from Raycast.

- [No, install the Crisp plugin](https://app.crisp.chat/initiate/plugin/f5ca7711-02b2-4f5b-bc39-216554c642b7/)

- [Yes, let me login](https://crispyraycast.com/login/)


`;

export function Command() {
  const {
    data,
    isLoading: isFetching,
    isValidating,
  } = useSWR(["conversations"], async () => {
    const { session } = await getSupabaseWithSession();
    if (!session) {
      return {
        ok: false as const,
        conversations: undefined,
      };
    }
    const client = createClient({ supabaseRef, session, url: backendUrl, fetch });

    const res = await client.api.v1.conversations.$get({});

    if (res.status === 401) {
      await LocalStorage.removeItem("session");
    }
    if (!res.ok) {
      throw new Error(await res.text());
    }

    const json = res.json();

    return json;
  });

  const isLoading = isFetching || isValidating;

  if (!isLoading && data?.conversations === undefined) {
    return <Detail markdown={initialScreen} />;
  }
  const allDomains = new Set(data?.conversations?.map((x) => x.site?.domain) || []);

  return (
    <List throttle searchBarPlaceholder="Search conversations" isLoading={isLoading}>
      {data?.conversations?.map((x, i) => {
        const { conversation, site } = x;
        const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), {
          addSuffix: true,
        }).replace("about ", "");
        const email = conversation?.meta.email || "visitor";

        const icon = (() => {
          if (!conversation.unread?.operator) {
            return { source: Icon.Dot, tintColor: Color.SecondaryText };
          }
          if (conversation.unread?.operator) {
            return { source: Icon.Dot, tintColor: Color.Red };
          }
        })();
        const country = conversation.meta?.device?.geolocation?.country;
        const segments = conversation.meta?.segments?.filter((x) => x !== "chat") || [];
        const domainColor = getStringColor(site?.domain || "");
        const nickname = conversation.meta.nickname || "visitor";
        return (
          <List.Item
            key={i}
            title={getFlagEmoji(country) + "  " + nickname}
            subtitle={conversation?.last_message || ""}
            icon={icon}
            keywords={[
              email,
              site?.domain || "",
              conversation.last_message,
              conversation.meta.nickname,
              ...segments,
            ].filter(isTruthy)}
            accessories={[
              {
                text: timeAgo,
                tooltip: new Date(conversation.updated_at).toLocaleString(),
              },
              allDomains.size > 1 &&
                Boolean(site?.domain) && {
                  tag: { value: site?.domain, color: domainColor },
                },
              // {
              //   icon: { source: getFlagEmoji(country) },
              // },
            ].filter(isTruthy)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`https://app.crisp.chat/website/${conversation.website_id}/inbox/${conversation.session_id}/`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return "";
  try {
    return countryCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  } catch {
    return "";
  }
}

const colorHash = new ColorHash({ lightness: 0.6, saturation: 0.2 });
function getStringColor(text: string) {
  return colorHash.hex(text || "");
}

// like Boolean but with typescript guard
function isTruthy<T>(x: T | undefined | null | false): x is T {
  return !!x;
}
