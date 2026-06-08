import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Preferences = {
  baseUrl: string;
};

type Cap = {
  id: number;
  slug: string;
  title: string;
  image_url: string | null;
  image_text: string | null;
  image_width: number | null;
  image_height: number | null;
  description: string;
  type: string;
  tags: string[];
  aliases: string[];
  score: number;
  source_url: string | null;
  view_count: number;
  created_order: number;
  created_by: { username: string; role: string } | null;
};

type CapsList = {
  items: Cap[];
};

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function absoluteUrl(baseUrl: string, path: string | null): string | undefined {
  if (!path) return undefined;

  try {
    return new URL(path, `${baseUrl}/`).toString();
  } catch {
    return undefined;
  }
}

function capPageUrl(baseUrl: string, cap: Cap): string {
  return `${baseUrl}/caps/${encodeURIComponent(cap.slug)}`;
}

function capSearchUrl(baseUrl: string, query: string): string {
  const params = new URLSearchParams({
    sort: "popular",
    limit: "40",
  });

  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  return `${baseUrl}/api/caps?${params.toString()}`;
}

function shortNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function compactText(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter(
      (part) => part !== null && part !== undefined && String(part).trim(),
    )
    .join("  ");
}

function markdownForCap(baseUrl: string, cap: Cap): string {
  return `[${cap.title}](${capPageUrl(baseUrl, cap)})`;
}

function detailMarkdown(baseUrl: string, cap: Cap): string {
  const imageUrl = absoluteUrl(baseUrl, cap.image_url);
  const image = imageUrl ? `![${cap.title}](${imageUrl})\n\n` : "";
  const tags = cap.tags.length
    ? cap.tags.map((tag) => `#${tag}`).join(" ")
    : "tagsiz";
  const aliases = cap.aliases.length ? cap.aliases.join(", ") : "yok";
  const sourceUrl = absoluteUrl(baseUrl, cap.source_url);
  const source = sourceUrl ? `[kaynak](${sourceUrl})` : "yok";
  const imageText = cap.image_text
    ? `\n\n## Gorseldeki Metin\n${cap.image_text}`
    : "";

  return `${image}# ${cap.title}

${cap.description}

| alan | deger |
| --- | --- |
| puan | ${cap.score} |
| goruntulenme | ${cap.view_count} |
| tur | ${cap.type || "caps"} |
| tagler | ${tags} |
| alternatif adlar | ${aliases} |
| kaynak | ${source} |

${imageText}`;
}

function useCapsSearch(baseUrl: string, query: string) {
  const [items, setItems] = useState<Cap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async () => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(capSearchUrl(baseUrl, query), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Capsarsiv API ${response.status} dondu.`);
      }

      const payload = (await response.json()) as CapsList;
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      if (controller.signal.aborted) return;

      const message =
        error instanceof Error
          ? error.message
          : "Capsarsiv API'ye ulasilamadi.";
      setError(message);
      setItems([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Arama tamamlanamadi",
        message,
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [baseUrl, query]);

  useEffect(() => {
    const timer = setTimeout(runSearch, query.trim() ? 180 : 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [runSearch, query]);

  return { items, isLoading, error, retry: runSearch };
}

function CapActions({ baseUrl, cap }: { baseUrl: string; cap: Cap }) {
  const pageUrl = capPageUrl(baseUrl, cap);
  const imageUrl = absoluteUrl(baseUrl, cap.image_url);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Browser" url={pageUrl} />
        <Action.Push
          title="Show Details"
          icon={Icon.Sidebar}
          target={
            <Detail
              navigationTitle={cap.title}
              markdown={detailMarkdown(baseUrl, cap)}
            />
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Page URL" content={pageUrl} />
        {imageUrl ? (
          <Action.CopyToClipboard title="Copy Image URL" content={imageUrl} />
        ) : null}
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={markdownForCap(baseUrl, cap)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function EmptyView({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) {
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Capsarsiv'e ulasilamadi"
        description={error}
        actions={
          <ActionPanel>
            <Action
              title="Tekrar Dene"
              icon={Icon.RotateClockwise}
              onAction={retry}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="Sonuc yok"
      description="Baska bir baslik, tag veya ifade dene."
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const baseUrl = useMemo(
    () => cleanBaseUrl(preferences.baseUrl || "https://capsarsiv.com"),
    [preferences.baseUrl],
  );
  const [query, setQuery] = useState("");
  const { items, isLoading, error, retry } = useCapsSearch(baseUrl, query);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Baslik, tag veya replik ara..."
      navigationTitle="Caps Ara"
    >
      {items.length === 0 && !isLoading ? (
        <EmptyView error={error} retry={retry} />
      ) : null}
      {items.map((cap) => {
        const imageUrl = absoluteUrl(baseUrl, cap.image_url);
        const accessories: List.Item.Accessory[] = [
          { text: `${shortNumber(cap.view_count)} goruntu` },
          { text: `${shortNumber(cap.score)} puan` },
        ];

        return (
          <List.Item
            key={cap.slug}
            id={cap.slug}
            title={cap.title}
            subtitle={compactText([
              cap.type || "caps",
              cap.tags.slice(0, 3).join(", "),
            ])}
            icon={imageUrl ? { source: imageUrl } : Icon.Image}
            accessories={accessories}
            keywords={[cap.slug, cap.description, ...cap.tags, ...cap.aliases]}
            actions={<CapActions baseUrl={baseUrl} cap={cap} />}
          />
        );
      })}
    </List>
  );
}
