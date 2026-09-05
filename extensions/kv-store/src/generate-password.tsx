import { Detail, LaunchType, launchCommand } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef } from "react";

import { CATEGORY_STORAGE_KEY, Category, Entry, STORAGE_KEY } from "./entries";
import { PasswordEntryValues, PasswordForm } from "./password-form";

async function refreshMenuBar() {
  await launchCommand({ name: "menu-bar", type: LaunchType.Background }).catch(() => undefined);
}

export default function Command() {
  const {
    value: storedEntries,
    setValue: setStoredEntries,
    isLoading: areEntriesLoading,
  } = useLocalStorage<Entry[]>(STORAGE_KEY, []);
  const { value: storedCategories, isLoading: areCategoriesLoading } = useLocalStorage<Category[]>(
    CATEGORY_STORAGE_KEY,
    [],
  );

  const entries = storedEntries ?? [];
  const categories = storedCategories ?? [];
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  async function saveEntry(values: PasswordEntryValues) {
    const currentEntries = entriesRef.current;
    const duplicate = currentEntries.some(
      (entry) => entry.key.trim().toLocaleLowerCase() === values.key.trim().toLocaleLowerCase(),
    );

    if (duplicate) {
      throw new Error("This key already exists");
    }

    const now = new Date().toISOString();
    const nextEntry: Entry = { id: randomUUID(), ...values, createdAt: now, updatedAt: now };
    const nextEntries = [...currentEntries, nextEntry];

    entriesRef.current = nextEntries;
    await setStoredEntries(nextEntries);
    await refreshMenuBar();
    return nextEntries;
  }

  if (areEntriesLoading || areCategoriesLoading) {
    return <Detail isLoading />;
  }

  return <PasswordForm entries={entries} categories={categories} closeAfterSave onSave={saveEntry} />;
}
