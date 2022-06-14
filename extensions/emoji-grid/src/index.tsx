import { Action, ActionPanel, Grid } from "@raycast/api";
import type { Emoji, SkinTone, SkinToneKey } from "emojibase";
import emojis from "emojibase-data/en/data.json";
import {
  DARK_SKIN,
  LIGHT_SKIN,
  MEDIUM_DARK_SKIN,
  MEDIUM_LIGHT_SKIN,
  MEDIUM_SKIN,
  SKIN_KEY_DARK,
  SKIN_KEY_LIGHT,
  SKIN_KEY_MEDIUM,
  SKIN_KEY_MEDIUM_DARK,
  SKIN_KEY_MEDIUM_LIGHT,
} from "emojibase/src/constants";
import Fuse from "fuse.js";
import { useState } from "react";
import popular from "./popular";

const THUMBS_UP_EMOJI = emojis.find(({ hexcode }) => hexcode === "1F44D") as Emoji;

const SKINS: [SkinToneKey, SkinTone, string][] = [
  [SKIN_KEY_LIGHT, LIGHT_SKIN, "Light"],
  [SKIN_KEY_MEDIUM_LIGHT, MEDIUM_LIGHT_SKIN, "Medium Light"],
  [SKIN_KEY_MEDIUM, MEDIUM_SKIN, "Medium"],
  [SKIN_KEY_MEDIUM_DARK, MEDIUM_DARK_SKIN, "Medium Dark"],
  [SKIN_KEY_DARK, DARK_SKIN, "Dark"],
];

function skinToneToKey(tone: SkinTone) {
  return Object.fromEntries(SKINS.map(([a, b]) => [b, a]))[tone];
}

function skinKeyToTone(tone: SkinToneKey) {
  return Object.fromEntries(SKINS.map(([a, b]) => [a, b]))[tone];
}

const fuse = new Fuse(
  emojis.filter((emoji) => emoji.label.trim() !== ""),
  { includeScore: false, keys: ["label", "tags"] }
);

export default function Command() {
  const [skinTone, setSkinTone] = useState<SkinToneKey | "">("");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const results = searchText.trim()
    ? fuse.search(searchText).map((result) => result.item)
    : emojis.filter((emoji) => popular.find((hex) => hex === emoji.hexcode));
  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Skin Tone"
          storeValue
          onChange={(newValue) => {
            setSkinTone(newValue as SkinToneKey);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title={`${THUMBS_UP_EMOJI.emoji} Default`} value={""} />
          {THUMBS_UP_EMOJI.skins?.map((emoji, i) => (
            <Grid.Dropdown.Item
              key={emoji.hexcode}
              title={`${emoji.emoji} ${SKINS[i][2]}`}
              value={skinToneToKey(emoji.tone as SkinTone)}
            />
          ))}
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        results.map((emoji) => {
          const toneEmoji = skinTone && emoji.skins ? emoji.skins[skinKeyToTone(skinTone)].emoji : emoji.emoji;
          return (
            <Grid.Item
              key={emoji.hexcode}
              content={{
                value: { source: toneEmoji },
                tooltip: emoji.text,
              }}
              title={emoji.label}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={toneEmoji} />
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
