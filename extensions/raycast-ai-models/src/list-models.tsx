import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { fetchModels, Model, sortModels, SortBy } from "./api";
import { getFavicon } from "@raycast/utils";

export default function Command() {
  const [models, setModels] = useState<Model[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<string>("intelligence_desc");

  const { sortBy, desc } = useMemo(() => {
    const parts = sortConfig.split("_");
    const isDesc = parts[parts.length - 1] === "desc";
    const sortType = parts.slice(0, -1).join("_") as SortBy;
    return { sortBy: sortType, desc: isDesc };
  }, [sortConfig]);

  useEffect(() => {
    let mounted = true;

    // Immediately try to load cached data first (show stale data fast)
    fetchModels()
      .then((ms) => {
        if (!mounted) return;
        setModels(ms);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
        showToast({ style: Toast.Style.Failure, title: "Failed to load models", message: String(e) });
        setLoading(false);
      });

    // Then fetch fresh data in the background (revalidate)
    const revalidate = async () => {
      try {
        const fresh = await fetchModels({ force: true });
        if (mounted) {
          setModels(fresh);
        }
      } catch (e) {
        // Silent fail for background refresh
        console.error("Background refresh failed:", e);
      }
    };

    // Start background refresh after a short delay to avoid blocking UI
    const timer = setTimeout(revalidate, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const sorted = useMemo(() => {
    if (!models) return [] as Model[];
    return sortModels(models, sortBy, desc);
  }, [models, sortBy, desc]);

  // Memoize favicon URLs to avoid recomputation
  const modelIcons = useMemo(() => {
    if (!models) return new Map<string, string>();
    return new Map(
      models.map((m) => [
        m.id,
        getFavicon(`https://${m.provider_name ?? m.provider}.com`, {
          fallback: `https://${m.provider_brand}.com`,
        }),
      ]),
    );
  }, [models]);

  if (loading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error} />
      </List>
    );
  }

  return (
    <List
      searchBarAccessory={
        <List.Dropdown value={sortConfig} tooltip="Sort by" onChange={(v: string) => setSortConfig(v)}>
          <List.Dropdown.Item title="Intelligence (Desc)" value="intelligence_desc" />
          <List.Dropdown.Item title="Intelligence (Asc)" value="intelligence_asc" />
          <List.Dropdown.Item title="Speed (Desc)" value="speed_desc" />
          <List.Dropdown.Item title="Speed (Asc)" value="speed_asc" />
          <List.Dropdown.Item title="Intelligence → Speed (Desc)" value="intelligence_then_speed_desc" />
          <List.Dropdown.Item title="Intelligence → Speed (Asc)" value="intelligence_then_speed_asc" />
          <List.Dropdown.Item title="Speed → Intelligence (Desc)" value="speed_then_intelligence_desc" />
          <List.Dropdown.Item title="Speed → Intelligence (Asc)" value="speed_then_intelligence_asc" />
          <List.Dropdown.Item title="Combined (int + speed) (Desc)" value="combined_desc" />
          <List.Dropdown.Item title="Combined (int + speed) (Asc)" value="combined_asc" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Models (${sorted.length})`} subtitle={`sorted by ${sortBy} ${desc ? "desc" : "asc"}`}>
        {sorted.map((m) => (
          <List.Item
            key={m.id}
            icon={modelIcons.get(m.id)}
            title={m.name}
            subtitle={m.provider_name ?? m.provider}
            accessories={[{ text: `Intelligence ${m.intelligence}` }, { text: `Speed ${m.speed}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={<Detail markdown={`# ${m.name}\n\n${m.description ?? ""}`} />}
                />
                <Action.CopyToClipboard title="Copy Model ID" content={m.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Controls">
        <List.Item
          title="Refresh Models"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={async () => {
                  setLoading(true);
                  try {
                    const ms = await fetchModels({ force: true });
                    setModels(ms);
                    showToast({ style: Toast.Style.Success, title: "Models refreshed" });
                  } catch (e) {
                    showToast({ style: Toast.Style.Failure, title: "Refresh failed", message: String(e) });
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
