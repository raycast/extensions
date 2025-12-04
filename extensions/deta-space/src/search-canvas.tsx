import { ActionPanel, Action, Grid, environment, Icon, getPreferenceValues } from "@raycast/api";
import SearchCollections from "./search-collections";
import SearchDiscovery from "./search-discovery";
import SearchProjects from "./search-projects";
import { useSpace } from "./hooks/use-space";
import { Instance } from "./types/types";
import { useMemo } from "react";

type InstancesResponse = {
  instances: Instance[];
};

type CanvasResponse = {
  items: {
    id: string;
    index_number: number;
    item_id: string;
    item_type: "discovery" | "system_app";
    data: null;
  }[];
};

const systemApps: Record<string, JSX.Element> = {
  discovery: <Discovery key="discovery" />,
  docs: <Docs key="docs" />,
  builder: <Builder key="builder" />,
  collections: <Collections key="collections" />,
  legacy_cloud: <LegacyCloud key="legacy_cloud" />,
  manual: <Manual key="manual" />,
};

const { iconSize } = getPreferenceValues();
export default function Command() {
  const { data: canvas, isLoading: isCanvasLoading } = useSpace<CanvasResponse>("/canvas?limit=999");
  const { data: instances, isLoading: isInstancesLoading } = useSpace<InstancesResponse>("/instances");
  const isLoading = isCanvasLoading || isInstancesLoading;
  const getNbColumns = () => {
    switch (iconSize) {
      case "small":
        return 8;
      case "medium":
        return 7;
      case "large":
        return 6;
    }
  };

  const instanceMap = useMemo(() => {
    return instances?.instances.reduce((acc, instance) => {
      acc[instance.id] = instance;
      return acc;
    }, {} as Record<string, Instance>);
  }, [instances]);

  const getInstance = (id: string) => {
    const instance = instanceMap?.[id];
    if (!instance) {
      return null;
    }

    return <Instance key={instance.id} instance={instance} />;
  };

  return (
    <Grid isLoading={isLoading} columns={getNbColumns()} navigationTitle="Canvas">
      {isCanvasLoading
        ? null
        : canvas?.items.map((item) =>
            item.item_type === "system_app" ? systemApps[item.item_id] : getInstance(item.item_id)
          )}
    </Grid>
  );
}

function Instance({ instance }: { instance: Instance }) {
  const content_value = () => {
    if (instance.release.channel === "development") {
      return Icon.Hammer;
    }
    if (instance.release.icon_url) {
      return instance.release.icon_url;
    }

    return { color: "#ED3FA2" };
  };
  return (
    <Grid.Item
      key={instance.id}
      title={instance.release.app_name}
      content={{
        value: content_value(),
        tooltip: instance.release.short_description || "No description",
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={instance.url} />
            <Action.OpenInBrowser
              title="Open in Discovery"
              url={`https://deta.space/discovery/r/${instance.release.id}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Link"
              content={instance.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CreateQuicklink
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              quicklink={{ link: instance.url, name: instance.release.app_name }}
            />
            <Action.CopyToClipboard
              title="Copy Discovery Link"
              content={`https://deta.space/discovery/r/${instance.release.id}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Manual() {
  return (
    <Grid.Item
      content="https://deta.space/assets/manual.a2e80d80.webp"
      title="Manual"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://deta.space/manual" />
          <Action.CopyToClipboard content="https://deta.space/manual" />
        </ActionPanel>
      }
    />
  );
}

function LegacyCloud() {
  return (
    <Grid.Item
      content="https://deta.space/assets/legacy_cloud.43f2c117.webp"
      title="Legacy Cloud"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://deta.space/legacy" />
          <Action.CopyToClipboard content="https://deta.space/legacy" />
        </ActionPanel>
      }
    />
  );
}

function Discovery() {
  return (
    <Grid.Item
      content="https://deta.space/assets/discovery.b6035544.webp"
      title="Discovery"
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.AppWindowList} title="Search Discovery" target={<SearchDiscovery />} />
          <Action.OpenInBrowser url="https://deta.space/discovery" />
        </ActionPanel>
      }
    />
  );
}

function Builder() {
  return (
    <Grid.Item
      content="https://deta.space/assets/builder.9b3437f3.webp"
      title="Builder"
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.AppWindowList} title="Search Builder" target={<SearchProjects />} />
          <Action.OpenInBrowser url="https://deta.space/builder" />
        </ActionPanel>
      }
    />
  );
}

function Docs() {
  return (
    <Grid.Item
      content="https://deta.space/assets/docs.36387e5a.webp"
      title="Docs"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://deta.space/docs" />
        </ActionPanel>
      }
    />
  );
}

function Collections() {
  return (
    <Grid.Item
      content="https://deta.space/assets/collections.9c538cc2.png"
      title="Collections"
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.AppWindowList} title="Search Collections" target={<SearchCollections />} />
          <Action.OpenInBrowser url="https://deta.space/collections" />
        </ActionPanel>
      }
    />
  );
}
