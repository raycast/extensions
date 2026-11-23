import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import {
  CatalogTitle,
  PROVIDERS,
  ProviderChanges,
  SITE,
  titleUrl,
} from "./api";

function TitleItem({ t }: { t: CatalogTitle }) {
  const url = titleUrl(t);
  const subtitle = [t.year, t.date].filter(Boolean).join(" · ");
  return (
    <List.Item
      title={t.title}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Title" content={t.title} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [provider, setProvider] = useState("netflix");
  const { isLoading, data } = useFetch<ProviderChanges>(
    `${SITE}/api/streaming-changes?provider=${provider}`,
    {
      keepPreviousData: true,
    },
  );
  const label =
    data?.label ?? PROVIDERS.find((p) => p.key === provider)?.label ?? provider;
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${label} — Streaming Changes`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Service"
          value={provider}
          onChange={setProvider}
        >
          {PROVIDERS.map((p) => (
            <List.Dropdown.Item
              key={p.key}
              title={p.label}
              value={p.key}
              icon={Icon.Play}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title="New arrivals"
        subtitle={String(data?.added.length ?? 0)}
      >
        {(data?.added ?? []).map((t) => (
          <TitleItem key={`a-${t.tmdbType}-${t.tmdbId}`} t={t} />
        ))}
      </List.Section>
      <List.Section
        title="Coming soon"
        subtitle={String(data?.coming.length ?? 0)}
      >
        {(data?.coming ?? []).map((t) => (
          <TitleItem key={`c-${t.tmdbType}-${t.tmdbId}`} t={t} />
        ))}
      </List.Section>
      <List.Section title="Left" subtitle={String(data?.left.length ?? 0)}>
        {(data?.left ?? []).map((t) => (
          <TitleItem key={`l-${t.tmdbType}-${t.tmdbId}`} t={t} />
        ))}
      </List.Section>
      {!isLoading &&
        data &&
        !data.added.length &&
        !data.coming.length &&
        !data.left.length && (
          <List.EmptyView
            icon={Icon.FilmStrip}
            title={`No changes for ${label} today`}
          />
        )}
    </List>
  );
}
