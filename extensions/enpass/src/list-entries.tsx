import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import {
  getDisplayLogin,
  getEntryUrl,
  listEntries,
  pasteEntryField,
  pasteValue,
} from "./utils/enpass";
import { EnpassEntry, EnpassSortMode } from "./types";
import { PinForm } from "./components/PinForm";
import { EntryDetail } from "./components/EntryDetail";

const SORT_OPTIONS: { value: EnpassSortMode; title: string }[] = [
  { value: "updated", title: "Recently Modified" },
  { value: "created", title: "Recently Created" },
  { value: "used", title: "Recently Used" },
  { value: "usage", title: "Most Used" },
  { value: "title", title: "Title A-Z" },
  { value: "titleDesc", title: "Title Z-A" },
  { value: "category", title: "Category" },
];

function normalizeSortMode(value?: string): EnpassSortMode {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as EnpassSortMode)
    : "updated";
}

function isCliSortMode(sortMode: EnpassSortMode): boolean {
  return (
    sortMode === "updated" ||
    sortMode === "created" ||
    sortMode === "used" ||
    sortMode === "usage"
  );
}

function sortValue(entry: EnpassEntry, sortMode: EnpassSortMode): string {
  if (
    sortMode === "title" ||
    sortMode === "titleDesc" ||
    isCliSortMode(sortMode)
  ) {
    return entry.title;
  }
  if (sortMode === "category") {
    return entry.category ?? "";
  }
  return "";
}

function sortEntries(
  entries: EnpassEntry[],
  sortMode: EnpassSortMode,
): EnpassEntry[] {
  if (isCliSortMode(sortMode)) {
    return entries;
  }

  return [...entries].sort((first, second) => {
    if (sortMode === "titleDesc") {
      return second.title.localeCompare(first.title, undefined, {
        sensitivity: "base",
      });
    }

    const primary = sortValue(first, sortMode).localeCompare(
      sortValue(second, sortMode),
      undefined,
      { sensitivity: "base" },
    );
    if (primary !== 0) {
      return primary;
    }
    return first.title.localeCompare(second.title, undefined, {
      sensitivity: "base",
    });
  });
}

function getFieldCount(entry: EnpassEntry): number {
  return (entry.fields ?? []).filter((field) => field.value?.trim()).length;
}

function isInformativeLabel(label?: string): boolean {
  if (!label) {
    return false;
  }

  const normalized = label.trim().toLowerCase();
  return (
    Boolean(normalized) && !["password", "login", "old"].includes(normalized)
  );
}

function buildSubtitle(entry: EnpassEntry): string {
  const parts = [
    getDisplayLogin(entry),
    isInformativeLabel(entry.label) ? entry.label : undefined,
  ].filter(Boolean);
  return parts.join("  ·  ");
}

function getTimeAccessory(entry: EnpassEntry): List.Item.Accessory | undefined {
  if (entry.updated_time) {
    return { icon: Icon.Clock, tooltip: `Updated: ${entry.updated_time}` };
  }
  if (entry.created_time) {
    return { icon: Icon.Calendar, tooltip: `Created: ${entry.created_time}` };
  }
  return undefined;
}

function getEntryIcon(entry: EnpassEntry) {
  switch ((entry.category ?? entry.type ?? "").toLowerCase()) {
    case "creditcard":
      return { source: Icon.CreditCard, tintColor: Color.Yellow };
    case "license":
      return { source: Icon.Rosette, tintColor: Color.Purple };
    case "computer":
      return { source: Icon.Desktop, tintColor: Color.Blue };
    case "identity":
      return { source: Icon.PersonCircle, tintColor: Color.Magenta };
    case "finance":
      return { source: Icon.Wallet, tintColor: Color.Green };
    case "travel":
      return { source: Icon.Airplane, tintColor: Color.Blue };
    case "password":
      return { source: Icon.Lock, tintColor: Color.Orange };
    case "login":
    default:
      return { source: Icon.Key, tintColor: Color.Green };
  }
}

function buildAccessories(entry: EnpassEntry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const url = getEntryUrl(entry);
  const fieldCount = getFieldCount(entry);

  if (isInformativeLabel(entry.label)) {
    accessories.push({ icon: Icon.Tag, tooltip: `Label: ${entry.label}` });
  }
  if (fieldCount > 0) {
    accessories.push({
      text: String(fieldCount),
      icon: Icon.List,
      tooltip: `${fieldCount} fields`,
    });
  }
  if (entry.usage_count && entry.usage_count !== "0") {
    accessories.push({
      text: entry.usage_count,
      icon: Icon.BarChart,
      tooltip: `${entry.usage_count} uses`,
    });
  }
  const timeAccessory = getTimeAccessory(entry);
  if (timeAccessory) {
    accessories.push(timeAccessory);
  }
  if (url) {
    accessories.push({ icon: Icon.Link, tooltip: url });
  }
  if (entry.category && entry.category !== "login") {
    accessories.push({
      icon: Icon.Info,
      tooltip: `Category: ${entry.category}`,
    });
  }

  return accessories;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [pin, setPin] = useState<string | undefined>(preferences.pin);
  const [entries, setEntries] = useState<EnpassEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [sortMode, setSortMode] = useState<EnpassSortMode>(
    normalizeSortMode(preferences.sortMode),
  );

  const sortedEntries = useMemo(
    () => sortEntries(entries, sortMode),
    [entries, sortMode],
  );

  useEffect(() => {
    loadEntries(preferences.pin, sortMode);
  }, []);

  async function loadEntries(submittedPin?: string, nextSortMode = sortMode) {
    setIsLoading(true);
    try {
      const results = await listEntries(submittedPin, nextSortMode);
      setPin(submittedPin);
      setEntries(results);
      setNeedsPassword(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Enter your master password or check CLI settings.";
      const normalizedMessage = message.toLowerCase();
      const isAuthError =
        normalizedMessage.includes("password") ||
        normalizedMessage.includes("locked") ||
        normalizedMessage.includes("auth");
      setNeedsPassword(isAuthError);
      await showToast({
        style: Toast.Style.Failure,
        title: submittedPin ? "Failed to unlock vault" : "Could not read vault",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (needsPassword) {
    return <PinForm onPinSubmit={loadEntries} />;
  }

  async function handleSortChange(newValue: string) {
    const nextSortMode = normalizeSortMode(newValue);
    setSortMode(nextSortMode);
    await loadEntries(pin, nextSortMode);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search title, login, label, category..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Credentials"
          storeValue
          value={sortMode}
          onChange={handleSortChange}
        >
          {SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              title={option.title}
              value={option.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {sortedEntries.map((entry) => (
        <List.Item
          key={
            entry.uuid ??
            `${entry.title}:${entry.login ?? ""}:${entry.label ?? ""}`
          }
          title={entry.title}
          subtitle={buildSubtitle(entry)}
          icon={getEntryIcon(entry)}
          keywords={[
            getDisplayLogin(entry),
            entry.label,
            entry.category,
            entry.type,
            getEntryUrl(entry),
          ].filter((value): value is string => Boolean(value))}
          accessories={buildAccessories(entry)}
          actions={
            <ActionPanel>
              {getDisplayLogin(entry) ? (
                <Action
                  title="Copy and Paste Username / Email"
                  icon={Icon.Person}
                  onAction={() =>
                    pasteValue("Username / Email", getDisplayLogin(entry))
                  }
                />
              ) : null}
              <Action
                title="Copy and Paste Password"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() =>
                  pasteEntryField("Password", entry, "password", pin)
                }
              />
              <Action.Push
                title="Show Credential Form"
                icon={Icon.TextDocument}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                target={<EntryDetail entry={entry} pin={pin} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
