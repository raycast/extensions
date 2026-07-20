import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { existsSync } from "fs";
import { useEffect, useState } from "react";
import {
  CACHE_FILE,
  Glyph,
  MAX_DISPLAY,
  buildCache,
  getFont,
  glyphToDataUri,
  glyphToDetailUri,
  readCache,
  search,
  unicodeEscape,
} from "./utils";

export default function Command() {
  const { iconColor, fontName } = getPreferenceValues<Preferences.List>();
  const [allGlyphs, setAllGlyphs] = useState<Glyph[]>([]);
  const [results, setResults] = useState<Glyph[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async (forceRefresh = false) => {
    setIsLoading(true);

    if (forceRefresh || !existsSync(CACHE_FILE)) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Building glyph cache…",
        message: "First run — this takes a few seconds",
      });
      try {
        getFont(fontName);
        const glyphs = await buildCache();
        setAllGlyphs(glyphs);
        toast.style = Toast.Style.Success;
        toast.title = "Cache ready";
        toast.message = undefined;
        setResults(glyphs.slice(0, MAX_DISPLAY));
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Build failed";
        toast.message = e instanceof Error ? e.message : String(e);
        setIsLoading(false);
        return;
      }
    } else {
      try {
        const glyphs = readCache();
        setAllGlyphs(glyphs);
        getFont(fontName);
        setResults(glyphs.slice(0, MAX_DISPLAY));
      } catch {
        return load(true);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onSearchTextChange = (text: string) => setResults(search(allGlyphs, text));

  const copyAndClose = async (glyph: string) => {
    await Clipboard.copy(glyph);
    await showHUD(`Copied ${glyph}`);
    await closeMainWindow();
  };

  const copyAndStay = async (glyph: string) => {
    await Clipboard.copy(glyph);
    await showHUD(`Copied ${glyph}`);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search glyphs by name or codepoint…"
      onSearchTextChange={onSearchTextChange}
      throttle
      isShowingDetail
    >
      {results.map((g) => {
        const iconUri = glyphToDataUri(g, iconColor);
        const detailUri = glyphToDetailUri(g, iconColor);
        return (
          <List.Item
            key={g.codepoint}
            icon={{ source: iconUri }}
            title={g.name}
            subtitle={g.codepoint}
            detail={
              <List.Item.Detail
                markdown={`![${g.name}](${detailUri})\n`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={g.name} />
                    <List.Item.Detail.Metadata.Label title="Codepoint" text={g.codepoint} />
                    <List.Item.Detail.Metadata.Label title="Unicode Escape" text={unicodeEscape(g.codepoint)} />
                    <List.Item.Detail.Metadata.Label title="HTML Entity" text={`&#x${g.codepoint.slice(2)};`} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Glyph" text={g.glyph} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Copy Glyph & Close" onAction={() => copyAndClose(g.glyph)} />
                <Action
                  title="Copy Glyph"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => copyAndStay(g.glyph)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Copy Codepoint"
                    shortcut={{ modifiers: ["opt"], key: "c" }}
                    onAction={() => copyAndStay(g.codepoint)}
                  />
                  <Action
                    title="Copy Name"
                    shortcut={{ modifiers: ["opt"], key: "n" }}
                    onAction={() => copyAndStay(g.name)}
                  />
                  <Action
                    title="Copy Unicode Escape"
                    shortcut={{ modifiers: ["opt"], key: "u" }}
                    onAction={() => copyAndStay(unicodeEscape(g.codepoint))}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh Cache"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={() => load(true)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
