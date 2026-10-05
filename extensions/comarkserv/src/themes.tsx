import {
  Action,
  ActionPanel,
  closeMainWindow,
  getSelectedFinderItems,
  Icon,
  List,
  LocalStorage,
  open,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { useState } from "react";
import { runComarkserv } from "./lib/comarkserv";
import { defaultTheme, startPreview } from "./lib/previews";

interface ThemeEntry {
  id: string;
  name: string;
}

interface Palette {
  id: string;
  name: string;
  variant: "light" | "dark";
  colors: string[];
  accent?: string;
}

// The swatches: the background, the text, then red, orange, yellow, green, blue and purple.
const SWATCH_SLOTS = [0, 5, 8, 9, 10, 11, 13, 14];
const SLOT_NAMES = ["Background", "Text", "Red", "Orange", "Yellow", "Green", "Blue", "Purple"];

function ThemeDetail({ id }: { id: string }) {
  const builtIn = id === "github" || id === "omarchy";
  const { data, isLoading } = useCachedPromise(
    async (theme: string) => JSON.parse(await runComarkserv(["theme", theme, "--json"])) as Palette,
    [id],
    { execute: !builtIn },
  );
  if (builtIn) {
    return (
      <List.Item.Detail
        markdown={
          id === "github"
            ? "The built-in GitHub theme, with light, dark and system modes."
            : "The current Omarchy theme of this machine. Open previews change their colors with the Omarchy theme."
        }
      />
    );
  }
  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        data ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={data.name} />
            <List.Item.Detail.Metadata.Label title="Variant" text={data.variant} />
            <List.Item.Detail.Metadata.Separator />
            {SWATCH_SLOTS.map((slot, index) => (
              <List.Item.Detail.Metadata.TagList key={slot} title={SLOT_NAMES[index] ?? ""}>
                <List.Item.Detail.Metadata.TagList.Item text={data.colors[slot] ?? ""} color={data.colors[slot]} />
              </List.Item.Detail.Metadata.TagList>
            ))}
            {data.accent ? (
              <List.Item.Detail.Metadata.TagList title="Accent">
                <List.Item.Detail.Metadata.TagList.Item text={data.accent} color={data.accent} />
              </List.Item.Detail.Metadata.TagList>
            ) : null}
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

export default function Command() {
  const { data: themes, isLoading } = useCachedPromise(
    async () => JSON.parse(await runComarkserv(["themes", "--json"])) as ThemeEntry[],
  );
  const { data: current, revalidate } = usePromise(defaultTheme);
  const [selected, setSelected] = useState<string | null>(null);

  const previewWith = async (theme: string) => {
    const items = await getSelectedFinderItems().catch(() => []);
    const target = items[0]?.path;
    if (!target) {
      await showHUD("Select a markdown file or a folder in Finder");
      return;
    }
    await closeMainWindow();
    try {
      const started = await startPreview(target, theme);
      await open(started.url);
      await showHUD(`Previewing ${basename(target)}`);
    } catch (error) {
      await showFailureToast(error, { title: "comarkserv did not start" });
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search 580+ themes"
      onSelectionChange={setSelected}
    >
      {themes?.map((theme) => (
        <List.Item
          key={theme.id}
          id={theme.id}
          title={theme.name}
          keywords={[theme.id, ...theme.id.split(/[:-]/)]}
          accessories={[
            { tag: theme.id.split(":")[0] ?? "" },
            ...(theme.id === current ? [{ icon: Icon.Checkmark, tooltip: "The default theme" }] : []),
          ]}
          detail={selected === theme.id ? <ThemeDetail id={theme.id} /> : <List.Item.Detail />}
          actions={
            <ActionPanel>
              <Action
                title="Set as Default Theme"
                icon={Icon.Checkmark}
                onAction={async () => {
                  await LocalStorage.setItem("theme", theme.id);
                  revalidate();
                  await showHUD(`${theme.name} is the default theme`);
                }}
              />
              <Action
                title="Preview Finder Selection with This Theme"
                icon={Icon.Globe}
                onAction={() => previewWith(theme.id)}
              />
              <Action.CopyToClipboard title="Copy Theme Option" content={`--theme ${theme.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
