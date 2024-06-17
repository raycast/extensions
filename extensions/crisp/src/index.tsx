import { Action, ActionPanel, Cache, Color, Detail, Icon, List } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";

import { fetch, Headers } from "undici";
import { createClient } from "./generated/client";

import useSWR, { Cache as SwrCache, SWRConfig } from "swr";
import { getSupabaseWithSession, supabaseRef } from "./supabase-raycast";

// required to make Hono client work
globalThis.Headers = Headers;

const backendUrl = "http://localhost:8045";

const cache = new Cache();

const swrCache: SwrCache = {
  delete(key) {
    const keys = JSON.parse(cache.get("keys") || "[]");
    keys.splice(keys.indexOf(key), 1);

    cache.remove(key);
    cache.set("keys", JSON.stringify(keys));
  },
  get(key) {
    return JSON.parse(cache.get(key) || "null");
  },
  set(key, value) {
    const keys = JSON.parse(cache.get("keys") || "[]");
    keys.push(key);
    cache.set(key, JSON.stringify(value));
    cache.set("keys", JSON.stringify(keys));
  },
  keys() {
    const keys = JSON.parse(cache.get("keys") || "[]");
    return keys;
  },
};

export default function Wrapper() {
  return (
    <SWRConfig value={{ provider: () => swrCache }}>
      <Command />
    </SWRConfig>
  );
}

const initialScreen = `
# Do you already have installed the Crisp plugin?

Crisp Raycast extension requires installing the Crisp plugin to use the Crisp API.

- [Yes, let me login](https://crispyraycast.com/login)

- [No, install it](https://crisp.chat/en/integrations/urn:tommaso.de.rossi:raycast:0/)

`;

export function Command() {
  const { data: sessionData, isLoading: isLoggingIn } = useSWR(["supabase"], () => getSupabaseWithSession());
  const {
    data,
    isLoading: isFetching,
    isValidating,
  } = useSWR(sessionData?.session ? ["conversations"] : null, async () => {
    const session = sessionData?.session;
    if (!session) {
      throw new Error("No session");
    }
    const client = createClient({ supabaseRef, session, url: backendUrl, fetch });
    const res = await client.api.v1.conversations.$get({});
    if (!res.ok) {
      throw new Error(await res.text());
    }

    return res.json();
  });
  const isLoading = isLoggingIn || isFetching || isValidating;

  if (!data?.conversations && !sessionData?.session && !isLoading) {
    return <Detail markdown={initialScreen} />;
  }

  return (
    <List
      throttle
      searchBarPlaceholder="Search conversations"
      // searchBarAccessory={<>{user && <SearchBarAccessory onTeamChange={onTeamChange} />}</>}

      isLoading={isLoading}
    >
      {data?.conversations?.map((x, i) => {
        const { conversation, site } = x;
        const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), {
          addSuffix: true,
        });
        const email = conversation?.meta.email || "visitor";

        const icon = (() => {
          if (!conversation.unread.operator) {
            return { source: Icon.Dot, tintColor: Color.SecondaryText };
          }
          if (conversation.unread.operator) {
            return { source: Icon.Dot, tintColor: Color.Red };
          }
        })();
        const country = conversation.meta.device.geolocation.country;

        return (
          <List.Item
            key={i}
            title={getFlagEmoji(country) + "  " + email}
            subtitle={conversation?.last_message || ""}
            icon={icon}
            keywords={[email, site?.domain || "", conversation.last_message]}
            accessories={[
              {
                text: timeAgo,
                tooltip: new Date(conversation.updated_at).toLocaleString(),
              },
              {
                tag: site?.domain,
                icon: site?.logo ? { source: "boxicon-git-branch.svg", tintColor: Color.SecondaryText } : null,
              },
              // {
              //   icon: { source: getFlagEmoji(country) },
              // },
            ]}
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
  return countryCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
