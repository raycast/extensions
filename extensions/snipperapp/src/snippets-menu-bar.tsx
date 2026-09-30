import { Clipboard, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { searchSnippets } from "./lib/snipper-helper";
import type { Snippet } from "./lib/types";

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const [favorites, recent] = await Promise.all([
      searchSnippets({ favorite: true, limit: 15 }),
      searchSnippets({ limit: 15 }),
    ]);
    return { favorites, recent };
  });

  async function copy(snippet: Snippet) {
    await Clipboard.copy(snippet.content);
    await showHUD(`Copied: ${snippet.title}`);
  }

  const favorites = data?.favorites ?? [];
  const recent = data?.recent ?? [];
  const hasItems = favorites.length > 0 || recent.length > 0;

  return (
    <MenuBarExtra icon={Icon.Code} tooltip="SnipperApp" isLoading={isLoading}>
      {favorites.length > 0 && (
        <MenuBarExtra.Section title="Favorites">
          {favorites.map((snippet) => (
            <MenuBarExtra.Item key={snippet.id} title={snippet.title} icon={Icon.Star} onAction={() => copy(snippet)} />
          ))}
        </MenuBarExtra.Section>
      )}
      {recent.length > 0 && (
        <MenuBarExtra.Section title="Recent">
          {recent.map((snippet) => (
            <MenuBarExtra.Item key={snippet.id} title={snippet.title} onAction={() => copy(snippet)} />
          ))}
        </MenuBarExtra.Section>
      )}
      {!isLoading && !hasItems && <MenuBarExtra.Item title="No snippets found" />}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open SnipperApp" icon={Icon.AppWindow} onAction={() => open("snipper://")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
