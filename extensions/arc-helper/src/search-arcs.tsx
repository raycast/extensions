import { ActionPanel, Action, List, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { API, Arc, PaginatedResponse } from "./api";
import { getCached, setCache, CacheKeys } from "./cache";

function ArcDetail({ arc }: { arc: Arc }) {
  const markdown = `
# ${arc.name}

${arc.image ? `![${arc.name}](${arc.image})` : arc.icon ? `![${arc.name}](${arc.icon})` : ""}

${arc.description || "No description available."}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={arc.name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="MetaForge"
            target={`https://metaforge.app/arc-raiders/database/arc/${arc.id}`}
            text="View on MetaForge"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/database/arc/${arc.id}`} />
          <Action.CopyToClipboard title="Copy Arc Name" content={arc.name} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchArcs() {
  const [searchText, setSearchText] = useState("");

  const cachedArcs = getCached<Arc[]>(CacheKeys.arcs);

  const { isLoading, data } = useFetch<PaginatedResponse<Arc>>(API.arcs, {
    keepPreviousData: true,
    onError() {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load ARCs",
        message: "Server temporarily unavailable. Please try again.",
      });
    },
  });

  // Update cache when data changes
  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      setCache(CacheKeys.arcs, data.data);
    }
  }, [data]);

  const arcs = data?.data || cachedArcs || [];

  const filteredArcs = useMemo(() => {
    return arcs.filter((arc) => {
      if (searchText === "") return true;
      const search = searchText.toLowerCase();
      return arc.name.toLowerCase().includes(search) || arc.description?.toLowerCase().includes(search);
    });
  }, [arcs, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search ARCs (enemies)..."
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {filteredArcs.map((arc) => (
        <List.Item
          key={arc.id}
          icon={{ source: arc.icon, fallback: Icon.Bug }}
          title={arc.name}
          subtitle={arc.description?.slice(0, 60) + "..."}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<ArcDetail arc={arc} />} />
              <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/database/arc/${arc.id}`} />
              <Action.CopyToClipboard title="Copy Arc Name" content={arc.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
