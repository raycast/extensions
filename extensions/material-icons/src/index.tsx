import { ActionPanel, Action, List, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect, useMemo, memo } from "react";
import fetch, { AbortError } from "node-fetch";
import * as fzy from "fzy.js";

export default function Command() {
  const { icons, search, isLoading } = useSearch();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search icons..." throttle>
      <List.Section title="Results" subtitle={icons.length > 0 ? `Found ${icons.length} icons` : undefined}>
        {icons.map((icon) => {
          return <SearchListItem key={icon.name} icon={icon} />;
        })}
      </List.Section>
    </List>
  );
}

const SearchListItem: React.VFC<{ icon: Icon }> = memo(({ icon }) => {
  return (
    <List.Item
      title={icon.name}
      subtitle={icon.codepoint}
      accessories={[
        { text: icon.categories },
        ...icon.assets.slice(1).map((asset) => ({ icon: { source: asset.url, tintColor: Color.Blue } })),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={icon.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard
              title="Copy Codepoint"
              content={icon.codepoint}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={{ source: icon.assets[0].url, tintColor: Color.Blue }}
    />
  );
});

function hasMatch(icon: Icon, query: string): boolean {
  return fzy.hasMatch(query, icon.name) || icon.tags.some((tag) => fzy.hasMatch(query, tag));
}

function score(icon: Icon, query: string): number {
  return Math.max(...[icon.name, icon.tags.join("/")].map((tag, i) => fzy.score(query, tag) * (i === 0 ? 100 : 0.001)));
}

function useSearch() {
  const [query, setQuery] = useState("");
  const [icons, setIcons] = useState<Icon[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchIcons(controller.signal)
      .then(setIcons)
      .catch((e) => {
        if (e instanceof AbortError) return;
        console.error("fetch error", e);
        showToast({ style: Toast.Style.Failure, title: "Could not fetch icons" });
      });

    return () => {
      controller.abort();
    };
  }, []);

  const filteredIcons: Icon[] = useMemo(() => {
    if (!icons) return [];
    if (!query) return icons;

    return icons
      .filter((icon) => hasMatch(icon, query))
      .map((icon) => ({ icon, score: score(icon, query) }))
      .sort((a, b) => b.score - a.score)
      .map((v) => v.icon);
  }, [icons, query]);

  return {
    icons: filteredIcons,
    search: setQuery,
    isLoading: !icons,
  };
}

type Icon = {
  categories: string;
  codepoint: string;
  name: string;
  tags: string[];
  assets: IconAsset[];
};

type IconAsset = {
  family: string;
  url: string;
};

async function fetchIcons(signal: AbortSignal): Promise<Icon[]> {
  type Response = {
    host: string;
    asset_url_pattern: string;
    families: string[];
    icons: {
      categories: string[];
      codepoint: number;
      name: string;
      sizes_px: number[];
      tags: string[];
      version: number;
    }[];
  };

  const response = await fetch("https://fonts.google.com/metadata/icons", {
    method: "get",
    signal: signal,
  });

  const body = await response.text();
  const json = JSON.parse(body.replace(/^.+?\n/, "")) as Response;

  return json.icons.map<Icon>((icon) => {
    const assets: IconAsset[] = json.families.map((family) => {
      const path = json.asset_url_pattern
        .replace("{family}", family.toLowerCase().replace(/\W+/g, ""))
        .replace("{icon}", icon.name)
        .replace("{version}", String(icon.version))
        .replace("{asset}", `${icon.sizes_px[0] ?? 24}px`);
      const url = `https://${json.host}/${path}.svg`;

      return { family, url };
    });

    return {
      categories: icon.categories.join(", "),
      codepoint: icon.codepoint.toString(16),
      name: icon.name,
      tags: icon.tags,
      assets,
    };
  });
}
