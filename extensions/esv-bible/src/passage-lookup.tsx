import { useEffect, useState } from "react";
import crypto from "crypto";

// Raycast imports
import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  Cache,
} from "@raycast/api";

import { useFetch } from "@raycast/utils";

// types
import { PassageResponse, Preferences, Passage } from "./types";

// get user Prefs
const { ESVApiToken } = getPreferenceValues<Preferences>();

// dropdown styling options
import { stylingOptions } from "./stylingOptions";

const cache = new Cache({ namespace: "bible-verses", capacity: 1000000 });

export default function EsvSearch() {
  const cached = cache.get("bible-verses");
  const prevItems = cached ? JSON.parse(cached) : [];
  const [query, setQuery] = useState("");
  const [styling, setStyling] = useState(stylingOptions.default.value);
  const { isLoading, data: passages } = useFetch<PassageResponse>(
    `https://api.esv.org/v3/passage/text/?q=${query}${styling}`,
    {
      method: "GET",
      headers: {
        Authorization: `${ESVApiToken}`,
      },
      keepPreviousData: true,
      onError: (error: Error) => {
        if (query.length !== 0) {
          showToast({
            style: Toast.Style.Failure,
            title: `${error} Check your API Key`,
            message: `Your ESV API token is invalid or you have no internet connection.`,
            primaryAction: {
              title: "Change API Key",
              onAction: () => openExtensionPreferences(),
            },
          });
        }
      },
    }
  );
  const { data: plainPassages } = useFetch<PassageResponse>(
    `https://api.esv.org/v3/passage/text/?q=${query}${stylingOptions.none.value}`,
    {
      method: "GET",
      headers: {
        Authorization: `${ESVApiToken}`,
      },
      onError: (error: Error) => {
        if (query.length !== 0) {
          showToast({
            style: Toast.Style.Failure,
            title: `${error} Check your API Key`,
            message: `Your ESV API token is invalid or you have no internet connection.`,
            primaryAction: {
              title: "Change API Key",
              onAction: () => openExtensionPreferences(),
            },
          });
        }
      },
    }
  );
  const [searchResult, setSearchResult] = useState<Passage | undefined>(undefined);

  const clearCache = () => {
    cache.clear();
    setSearchResult(undefined);
    cache.set("bible-verses", JSON.stringify([]));
    showToast({
      style: Toast.Style.Success,
      title: `Previous passages removed`,
    });
  };

  useEffect(() => {
    if (passages && plainPassages) {
      const passageObject = {
        id: crypto.randomUUID(),
        ref: passages.canonical,
        passage: {
          styled: passages.passages
            .map((p) => p)
            .join("")
            .trim(),
          plain: plainPassages?.passages
            .map((p) => p)
            .join("")
            .trim(),
        },
      };
      setSearchResult(passageObject);
      const resultExists = prevItems.some((item: Passage) => item.ref === passageObject.ref);
      if (!resultExists && passages.passages.length !== 0) {
        cache.set("bible-verses", JSON.stringify([passageObject, ...prevItems]));
      }
    }
  }, [passages, plainPassages]);

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type one or more Bible references..."
      isShowingDetail={prevItems.length > 0}
      selectedItemId={searchResult?.id}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Styling" onChange={(style) => setStyling(style)} storeValue={true}>
          {Object.values(stylingOptions).map((style) => (
            <List.Dropdown.Item title={style.title} value={style.value} key={style.id} />
          ))}
        </List.Dropdown>
      }
    >
      {!query && prevItems.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type a Bible reference to get started"
          description="e.g., John 3:16, 1 John 1:1"
        />
      )}
      {searchResult && searchResult?.passage?.styled.length !== 0 && prevItems.length > 0 && (
        <List.Section title="Current Passage">
          <List.Item
            title={searchResult.ref}
            icon={Icon.Book}
            id="1"
            detail={<List.Item.Detail markdown={searchResult.passage.styled} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Styled Text" content={searchResult.passage.styled} />
                <Action.Paste title="Paste Styled Text" content={searchResult.passage.styled} />
                <Action.CopyToClipboard
                  title="Copy Plain Text"
                  content={searchResult.passage.plain}
                  shortcut={{ modifiers: ["shift"], key: "enter" }}
                />
                <Action.Paste
                  title="Paste Plain Text"
                  content={searchResult.passage.plain}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action.CopyToClipboard
                  title="Copy Reference"
                  content={searchResult.ref}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Clear Previous Passages"
                  onAction={clearCache}
                  icon={Icon.Eraser}
                  shortcut={{ modifiers: ["opt"], key: "backspace" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {searchResult &&
        searchResult?.passage?.styled.length === 0 &&
        (prevItems.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title="No result found"
            description="Please try another reference search (e.g., Genesis 1:1)"
          />
        ) : (
          <List.Section title="No result found">
            <List.Item title="Please try another search" icon={Icon.XMarkCircle} />
          </List.Section>
        ))}
      <List.Section title="Previous Passages">
        {prevItems
          .filter((i: Passage) => i.ref !== searchResult?.ref)
          .map((item: Passage) => (
            <List.Item
              key={item.id}
              title={item.ref}
              icon={Icon.Book}
              detail={<List.Item.Detail markdown={item.passage.styled} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Styled Text" content={item.passage.styled} />
                  <Action.Paste title="Paste Styled Text" content={item.passage.styled} />
                  <Action.CopyToClipboard
                    title="Copy Plain Text"
                    content={item.passage.plain}
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                  />
                  <Action.Paste
                    title="Paste Plain Text"
                    content={item.passage.plain}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Reference"
                    content={item.ref}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Clear Previous Passages"
                    onAction={clearCache}
                    icon={Icon.Eraser}
                    shortcut={{ modifiers: ["opt"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

// Before MVP

// 1. Change styling options for selected previous items? (⛔)
// 2. Auto select new queries
