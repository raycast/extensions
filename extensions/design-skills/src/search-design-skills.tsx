import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { DesignListItem } from "./components/DesignListItem";
import { useDesigns } from "./hooks/useDesigns";
import { useDownloadCounts } from "./hooks/useDownloadCounts";
import { useFavorites } from "./hooks/useFavorites";
import { Category, DesignSkill } from "./shared";

const CATEGORY_ORDER: Category[] = [
  "AI & LLM Platforms",
  "Developer Tools & IDEs",
  "Backend, Database & DevOps",
  "Productivity & SaaS",
  "Design & Creative Tools",
  "Fintech & Crypto",
  "E-commerce & Retail",
  "Media & Consumer Tech",
  "Automotive",
  "Other",
];

export default function Command() {
  const { data, isLoading, error, revalidate } = useDesigns();
  const slugs = useMemo(() => data.map((d) => d.slug), [data]);
  const { data: downloadCounts } = useDownloadCounts(slugs);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [category, setCategory] = useState<string>("all");

  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const design of data) {
      counts.set(design.category, (counts.get(design.category) ?? 0) + 1);
    }
    return counts;
  }, [data]);

  const { favorites, others } = useMemo(() => {
    const filtered = category === "all" ? data : data.filter((d) => d.category === category);
    const favs: DesignSkill[] = [];
    const rest: DesignSkill[] = [];
    for (const d of filtered) {
      if (isFavorite(d.slug)) favs.push(d);
      else rest.push(d);
    }
    return { favorites: favs, others: rest };
  }, [data, category, isFavorite]);

  if (error && data.length === 0) {
    return (
      <Detail
        markdown={`# Unable to Load Design Skills\n\n**Error:** ${error.message}\n\n---\n\nCheck your network connection and retry.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search design skills..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={category} storeValue onChange={setCategory}>
          <List.Dropdown.Item title={`All Categories (${data.length})`} value="all" />
          <List.Dropdown.Section title="Categories">
            {CATEGORY_ORDER.filter((c) => categoryCounts.has(c)).map((c) => (
              <List.Dropdown.Item key={c} title={`${c} (${categoryCounts.get(c)})`} value={c} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Design Skills Found"
          description="No results from the sitemap. Retry or check your connection."
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {favorites.length > 0 && (
            <List.Section title="Favorites" subtitle={`${favorites.length}`}>
              {favorites.map((design) => (
                <DesignListItem
                  key={`fav-${design.slug}`}
                  design={design}
                  downloadCount={downloadCounts[design.slug]}
                  isFavorite
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </List.Section>
          )}
          <List.Section title="All Design Skills" subtitle={`${others.length}`}>
            {others.map((design) => (
              <DesignListItem
                key={design.slug}
                design={design}
                downloadCount={downloadCounts[design.slug]}
                isFavorite={false}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
