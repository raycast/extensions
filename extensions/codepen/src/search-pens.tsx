import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { z } from "zod";
import { pensPath } from "./lib/client";
import { usePaged } from "./lib/hooks";
import { penSchema } from "./lib/models";
import { CommonActions, EmptyView, LoadMoreItem } from "./components/common";
import { PenActions } from "./components/pen-detail";
import { PenForm } from "./components/pen-form";

const filterSchema = z.enum([
  "all",
  "V2",
  "Classic",
  "templates",
  "deployed",
  "Public",
  "Private",
  "Protected",
  "Collaborators",
]);
export function PenList({ collection }: { collection?: { id: string; title: string } }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<z.infer<typeof filterSchema>>("all");
  const path = collection
    ? `collections/${encodeURIComponent(collection.id)}/pens?per_page=50`
    : pensPath({ search: search.slice(0, 200), filter });
  const { data, error, isLoading, pagination, revalidate } = usePaged(path, penSchema);
  const pens = collection
    ? data?.filter((pen) =>
        `${pen.title} ${pen.description} ${pen.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
      )
    : data;
  return (
    <List
      navigationTitle={collection?.title}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      throttle
      searchBarPlaceholder={
        collection ? "Search loaded Pens in this collection…" : "Search your Pens by title or description…"
      }
      pagination={pagination}
      searchBarAccessory={
        !collection ? (
          <List.Dropdown
            tooltip="Filter Pens"
            value={filter}
            onChange={(value) => setFilter(filterSchema.parse(value))}
          >
            <List.Dropdown.Item title="All Pens" value="all" />
            <List.Dropdown.Item title="CodePen 2.0" value="V2" />
            <List.Dropdown.Item title="Classic Pens" value="Classic" />
            <List.Dropdown.Item title="Templates" value="templates" />
            <List.Dropdown.Item title="Deployed" value="deployed" />
            <List.Dropdown.Section title="Privacy">
              {["Public", "Private", "Protected", "Collaborators"].map((value) => (
                <List.Dropdown.Item key={value} title={value} value={value} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <EmptyView
        error={error}
        title={search ? "No Matching Pens" : "No Pens Yet"}
        description="Only Pens owned by this API key’s user or team are available."
      >
        <Action.Push title="Create Pen" icon={Icon.Plus} target={<PenForm mode="create" onSaved={revalidate} />} />
        <CommonActions refresh={revalidate} />
      </EmptyView>
      {pens?.map((pen) => (
        <List.Item
          key={pen.id}
          title={pen.title || "Untitled"}
          subtitle={pen.description}
          icon={Icon.Code}
          accessories={[
            { tag: pen.editor === "Classic" ? "Classic" : pen.access },
            ...(pen.template ? [{ icon: Icon.Document, tooltip: "Template" }] : []),
            { date: new Date(pen.updated_at), tooltip: "Last Updated" },
          ]}
          actions={
            <ActionPanel>
              <PenActions pen={pen} refresh={revalidate} collection={collection} />
              <CommonActions refresh={revalidate} />
            </ActionPanel>
          }
        />
      ))}
      {collection && (
        <LoadMoreItem hasMore={pagination?.hasMore ?? false} onLoadMore={() => pagination?.onLoadMore()} />
      )}
    </List>
  );
}
export default function Command() {
  return <PenList />;
}
