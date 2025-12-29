import { Action, ActionPanel, Grid, Icon, Color as RaycastColor, getPreferenceValues, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import hugeiconsMetadata from "../assets/hugeicons-metadata.json";

const BATCH_SIZE = 100;

type IconEntry = { name: string; displayName: string; svg: string; reactComponent: string };
type DefaultAction = "svg" | "react" | "usage" | "name";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);

  const iconEntries = Object.values(hugeiconsMetadata) as IconEntry[];

  const filteredIcons = useMemo(
    () => iconEntries.filter((icon) => icon.displayName.toLowerCase().includes(searchText.toLowerCase())),
    [searchText, iconEntries],
  );

  useEffect(() => {
    setDisplayCount(BATCH_SIZE);
  }, [searchText]);

  const displayedIcons = filteredIcons.slice(0, displayCount);
  const hasMore = displayCount < filteredIcons.length;
  const remaining = filteredIcons.length - displayCount;

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + BATCH_SIZE, filteredIcons.length));
  };

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search Hugeicons..."
      onSearchTextChange={setSearchText}
    >
      <Grid.Section title={`Hugeicons (${filteredIcons.length})`}>
        {displayedIcons.map((icon) => (
          <IconItem key={icon.name} icon={icon} />
        ))}
      </Grid.Section>
      {hasMore && (
        <Grid.Section title={`${remaining} more icons`}>
          <Grid.Item
            title="Load More"
            subtitle={`+${Math.min(BATCH_SIZE, remaining)}`}
            content={Icon.ArrowDown}
            actions={
              <ActionPanel>
                <Action title="Load More" onAction={loadMore} />
              </ActionPanel>
            }
          />
        </Grid.Section>
      )}
    </Grid>
  );
}

function IconItem({ icon }: { icon: IconEntry }) {
  const { defaultAction } = getPreferenceValues<Preferences.BrowseHugeicons>();

  const content = {
    source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`,
    tintColor: RaycastColor.PrimaryText,
  };

  const reactUsage = `<HugeiconsIcon icon={${icon.name}} />`;

  const actions: Record<
    DefaultAction,
    { title: string; content: string; shortcut?: { modifiers: "cmd"[]; key: string } }
  > = {
    svg: { title: "Copy SVG", content: icon.svg },
    react: {
      title: "Copy React Component",
      content: icon.reactComponent,
      shortcut: { modifiers: ["cmd"], key: "r" },
    },
    usage: {
      title: "Copy React Usage",
      content: reactUsage,
      shortcut: { modifiers: ["cmd"], key: "u" },
    },
    name: {
      title: "Copy Icon Name",
      content: icon.name,
      shortcut: { modifiers: ["cmd"], key: "n" },
    },
  };

  const orderedKeys: DefaultAction[] = [
    defaultAction,
    ...(Object.keys(actions).filter((k) => k !== defaultAction) as DefaultAction[]),
  ];

  return (
    <Grid.Item
      title={icon.displayName}
      content={content}
      actions={
        <ActionPanel>
          {orderedKeys.map((key) => (
            <Action.CopyToClipboard
              key={key}
              title={actions[key].title}
              content={actions[key].content}
              shortcut={key !== defaultAction ? (actions[key].shortcut as Keyboard.Shortcut) : undefined}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
