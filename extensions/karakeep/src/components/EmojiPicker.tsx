import { Action, ActionPanel, Grid, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { searchEmoji } from "../data/emoji";
import { LIST_ICON_EMOJI_OPTIONS } from "../utils/formatting";
import { useTranslation } from "../hooks/useTranslation";

/**
 * A searchable grid over the full Unicode emoji set, in the shape of Raycast's
 * own emoji picker. This backs an ACTION on the icon field rather than
 * replacing it — the field stays free text, and this is for when you'd rather
 * browse than remember.
 *
 * Filtering is ours (`filtering={false}`) rather than Raycast's, because
 * Raycast can only match items it has rendered: handing it all 1,870 to keep
 * them findable makes the grid slow to open. We search the whole set and render
 * only the top matches.
 */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");

  const query = searchText.trim();
  const results = useMemo(() => searchEmoji(query), [query]);

  // With an empty search box, offer the curated shortlist rather than the first
  // 200 emoji in Unicode order (which is 200 smileys). Rendered straight from
  // the curated entries — looking each one up in the full set only to read a
  // name we already have would build all 1,870 just to open the grid.
  const showing = query ? results : LIST_ICON_EMOJI_OPTIONS.map((o) => ({ char: o.value, name: o.title }));
  const sectionTitle = query ? t("list.iconPicker.results") : t("list.iconPicker.suggested");

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={t("list.iconPicker.title")}
      searchBarPlaceholder={t("list.iconPicker.searchPlaceholder")}
    >
      <Grid.EmptyView title={t("list.iconPicker.empty.title")} description={t("list.iconPicker.empty.description")} />
      <Grid.Section title={sectionTitle}>
        {showing.map((emoji) => (
          <Grid.Item
            key={emoji.char}
            content={emoji.char}
            title={emoji.name}
            actions={
              <ActionPanel>
                <Action
                  title={t("list.iconPicker.select")}
                  onAction={() => {
                    onPick(emoji.char);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
