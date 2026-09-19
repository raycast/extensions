import { Clipboard, Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

import { CATEGORY_STORAGE_KEY, Category, Entry, STORAGE_KEY } from "./entries";

export default function MenuBarCommand() {
  const { value: storedEntries, isLoading: areEntriesLoading } = useLocalStorage<Entry[]>(STORAGE_KEY, []);
  const { value: storedCategories, isLoading: areCategoriesLoading } = useLocalStorage<Category[]>(
    CATEGORY_STORAGE_KEY,
    [],
  );
  const entries = [...(storedEntries ?? [])].sort((left, right) => left.key.localeCompare(right.key));
  const categories = [...(storedCategories ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  const categoryIds = new Set(categories.map((category) => category.id));
  const uncategorizedEntries = entries.filter((entry) => !entry.categoryId || !categoryIds.has(entry.categoryId));
  const isLoading = areEntriesLoading || areCategoriesLoading;

  async function copyValue(entry: Entry) {
    try {
      await Clipboard.copy(entry.value);
      await showHUD(`Copied: ${entry.key}`);
    } catch {
      await showHUD(`Failed to Copy: ${entry.key}`);
    }
  }

  return (
    <MenuBarExtra
      icon={Icon.Key}
      isLoading={isLoading}
      tooltip={isLoading ? "Key Value Store is loading…" : `Key Value Store — ${entries.length} keys`}
    >
      {categories.length > 0 ? (
        <MenuBarExtra.Section title="Categories">
          {categories.map((category) => {
            const categoryEntries = entries.filter((entry) => entry.categoryId === category.id);

            return (
              <MenuBarExtra.Submenu key={category.id} icon={Icon.Folder} title={category.name}>
                {categoryEntries.length > 0 ? (
                  categoryEntries.map((entry) => (
                    <MenuBarExtra.Item
                      key={entry.id}
                      icon={Icon.Key}
                      title={entry.key}
                      onAction={() => copyValue(entry)}
                    />
                  ))
                ) : (
                  <MenuBarExtra.Item title="No Keys Yet" />
                )}
              </MenuBarExtra.Submenu>
            );
          })}
        </MenuBarExtra.Section>
      ) : null}

      {uncategorizedEntries.length > 0 ? (
        <MenuBarExtra.Section title={categories.length > 0 ? "Uncategorized" : "Keys"}>
          {uncategorizedEntries.map((entry) => (
            <MenuBarExtra.Item key={entry.id} icon={Icon.Key} title={entry.key} onAction={() => copyValue(entry)} />
          ))}
        </MenuBarExtra.Section>
      ) : entries.length === 0 && categories.length === 0 && !isLoading ? (
        <MenuBarExtra.Item title="No Keys Yet" />
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.AppWindow}
          title="Open Key Value Store"
          onAction={() => launchCommand({ name: "kv", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
