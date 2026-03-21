import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchKeybindings, cacheTTLMinutesOrDefault } from "./keybindings";
import { formatShortcutForDisplay, normalizeShortcut } from "./format";
import type { Keybinding, Preferences } from "./types";

export default function Command() {
  const { locale, useCache, cacheTTLMinutes } =
    getPreferenceValues<Preferences>();
  const ttlMinutes = cacheTTLMinutesOrDefault(cacheTTLMinutes);
  const [bindings, setBindings] = useState<Keybinding[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchKeybindings(locale, { useCache, ttlMinutes });
        if (!cancelled) {
          setBindings(data);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load keybindings",
          message: String(error),
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Lazygit actions or shortcuts"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      {filterBindings(bindings, searchText).map((binding) => (
        <List.Item
          key={`${binding.locale}-${binding.action}-${binding.shortcut}`}
          title={binding.action}
          keywords={buildKeywords(binding)}
          accessories={buildAccessories(binding)}
          detail={<List.Item.Detail markdown={buildDetailMarkdown(binding)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Shortcut"
                content={binding.shortcut}
              />
              <Action.OpenInBrowser
                title="Open Upstream Doc"
                url={binding.path}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => {
                  setIsLoading(true);
                  fetchKeybindings(locale, {
                    force: true,
                    useCache,
                    ttlMinutes,
                  })
                    .then(setBindings)
                    .catch((error) =>
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to refresh",
                        message: String(error),
                      }),
                    )
                    .finally(() => setIsLoading(false));
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function filterBindings(all: Keybinding[], search: string): Keybinding[] {
  const query = search.trim().toLowerCase();
  if (!query) return all;

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return all;

  return all.filter((binding) => {
    const haystacks = [
      binding.action,
      binding.shortcut,
      normalizeShortcut(binding.shortcut),
      binding.category ?? "",
      binding.info ?? "",
      binding.context ?? "",
    ].map((v) => v.toLowerCase());

    return tokens.every((token) =>
      haystacks.some((text) => text.includes(token)),
    );
  });
}

function buildKeywords(binding: Keybinding): string[] {
  return [
    binding.shortcut,
    normalizeShortcut(binding.shortcut),
    binding.category ?? "",
    binding.info ?? "",
    binding.context ?? "",
  ].filter(Boolean);
}

function buildAccessories(binding: Keybinding): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (binding.shortcut) {
    accessories.push({ text: formatShortcutForDisplay(binding.shortcut) });
  }
  if (binding.category) {
    accessories.push({ tag: binding.category });
  }
  accessories.push({ tag: binding.locale });

  return accessories;
}

function buildDetailMarkdown(binding: Keybinding): string {
  const lines = [
    `**Action:** ${binding.action}`,
    `**Shortcut:** ${formatShortcutForDisplay(binding.shortcut)}`,
    binding.category ? `**Category:** ${binding.category}` : undefined,
    binding.context ? `**Context:** ${binding.context}` : undefined,
    binding.info ? `**Info:** ${binding.info}` : undefined,
    `**Locale:** ${binding.locale}`,
    binding.path ? `[Open upstream doc](${binding.path})` : undefined,
  ].filter(Boolean);

  return lines.join("\n\n");
}
