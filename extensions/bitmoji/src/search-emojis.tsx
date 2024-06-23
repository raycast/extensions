import { image } from "image-downloader";
import { runAppleScript } from "run-applescript";
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  showHUD,
  getPreferenceValues,
  environment,
  openCommandPreferences,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { emojis, categories } from "./data.json";

import { Emoji } from "./types";
const DEFAULT_ID = "20246000_31-s1";

export default function Command() {
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [results, setResults] = useState<Emoji[]>([]);

  const pref = getPreferenceValues();
  const imagePah = `${environment.supportPath}/bitmoji.png`;
  const myID = pref.myID || DEFAULT_ID;

  const getImageWithMyID = ({ src }: { src: string }) => {
    // Replace user ID pattern with '%s' placeholder then replace it with my user ID
    src = src.replace(/\d{9}_1(_|-)s1/, "%s");
    src = src.replace("%s", myID);
    return src;
  };

  const getAndCopy = async (src: string) => {
    await image({ url: src, dest: imagePah }).catch((e) => console.log("Error", e));
    await runAppleScript(`set the clipboard to POSIX file "${imagePah}"`);
  };

  useEffect(() => {
    const filteredResults = emojis.filter(
      (e) =>
        (filterCat === "" || e.categories.includes(filterCat)) &&
        (e.tags.some((k) => k.includes(query)) || e.title.includes(query) || e.description.includes(query)),
    );

    filteredResults.sort(() => Math.random() - 0.5);

    setResults(filteredResults);
  }, [query, filterCat]);

  function EmojiItem({ emoji }: { emoji: Emoji }) {
    const { src, title, description, tags } = emoji;
    const SRC = getImageWithMyID({ src });

    const handleCopy = async (src: string) => {
      await getAndCopy(src);
      showHUD("Copied");
    };

    return (
      <Grid.Item
        content={SRC}
        keywords={[title, description, ...tags]}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Clipboard}
              title="Copy Image"
              onAction={() => {
                handleCopy(SRC);
              }}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Path" content={SRC} shortcut={Keyboard.Shortcut.Common.CopyPath} />
            <Action.ShowInFinder title="Open in Finder" path={imagePah} shortcut={Keyboard.Shortcut.Common.Open} />

            {pref.myID === "" && (
              <Action icon={Icon.Gear} title="Add You Bitmoji ID" onAction={openCommandPreferences} />
            )}

            <ActionPanel.Submenu icon={Icon.Tag} title="Tags" shortcut={{ modifiers: ["cmd"], key: "t" }}>
              {tags.map((tag: string) => (
                <Action key={tag} icon={Icon.Tag} title={tag} onAction={() => setQuery(tag)} />
              ))}
            </ActionPanel.Submenu>

            <ActionPanel.Submenu icon={Icon.Info} title="More Info" shortcut={{ modifiers: ["cmd"], key: "i" }}>
              <Action.CopyToClipboard title={title} content={title} />
              {description && <Action.CopyToClipboard title={description} content={description} />}
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid
      searchBarPlaceholder="Search for Emojis"
      onSearchTextChange={setQuery}
      searchText={query}
      filtering={false}
      columns={Number(pref.columns)}
      fit={Grid.Fit.Contain}
      aspectRatio="1"
      searchBarAccessory={
        <Grid.Dropdown
          value={filterCat}
          tooltip="Category"
          onChange={(cat) => {
            setQuery("");
            setFilterCat(cat);
          }}
        >
          <Grid.Dropdown.Item icon={Icon.Tag} value="" title="All categories" />

          {categories.map((cat) => (
            <Grid.Dropdown.Item key={cat.name} icon={Icon.Tag} value={cat.name} title={cat.name} />
          ))}
        </Grid.Dropdown>
      }
    >
      {results.length > 0 && (
        <Grid.Section title={"Emojis"} subtitle={`${results.length}`}>
          {results.map((emoji) => (
            <EmojiItem key={emoji.src} emoji={emoji} />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
