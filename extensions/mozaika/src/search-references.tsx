import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import {
  absUrl,
  authHeaders,
  BROWSE_URL,
  detailUrl,
  Inspiration,
  inspirationsEndpoint,
  normalizeSiteInput,
  PRICING_URL,
} from "./lib/api";

export default function SearchReferences() {
  const [search, setSearch] = useState("");

  const { isLoading, data } = useFetch<Inspiration[]>(inspirationsEndpoint(search, 30), {
    headers: authHeaders(),
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn't load references" },
  });

  const items = data ?? [];

  return (
    <Grid
      columns={3}
      isLoading={isLoading}
      searchBarPlaceholder="Search real product screens — pricing, dashboard, onboarding…"
      onSearchTextChange={setSearch}
      throttle
    >
      {items.length === 0 && !isLoading ? (
        <Grid.EmptyView
          title="No matches"
          description="Try a page type (pricing, dashboard, onboarding) or a product name."
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        items.map((it) => {
          const image = absUrl(it.thumb || it.thumbnail);
          return (
            <Grid.Item
              key={it.slug}
              content={image ? { source: image } : { source: Icon.Image }}
              title={it.site}
              subtitle={it.title}
              keywords={it.tags}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Mozaika" url={detailUrl(it.slug)} icon={Icon.Image} />
                  {it.site_url && (
                    <Action.OpenInBrowser
                      title={`Visit ${it.site}`}
                      url={normalizeSiteInput(it.site_url)}
                      icon={Icon.Globe}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Screen Link"
                    content={detailUrl(it.slug)}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
                  />
                  <Action.OpenInBrowser title="Browse the Full Library" url={BROWSE_URL} />
                  <Action.OpenInBrowser
                    title="Unlock — Founder License"
                    url={PRICING_URL}
                    icon={Icon.Stars}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "u" }, Windows: { modifiers: ["ctrl"], key: "u" } }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </Grid>
  );
}
