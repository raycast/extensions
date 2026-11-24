import { ActionPanel, List, Action, Image, Icon, Keyboard } from "@raycast/api";
import { countOf, onErrorToast, showError } from "@chrismessina/raycast-kit";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import ProfileView from "./profile";
import Service from "./service";

const service = new Service();

export default function Command() {
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const search = useCallback(async (query: string) => {
    if (query === "") {
      return service.getLatestSearches();
    }

    const result = await service.search(query, abortable.current?.signal);
    return result.results;
  }, []);
  const canSearch = query === "" || (query.length >= 3 && query.length <= 21);
  const {
    data: results,
    isLoading,
    revalidate,
  } = useCachedPromise(search, [query], {
    abortable,
    execute: canSearch,
    initialData: [],
    keepPreviousData: false,
    onError: onErrorToast({ title: "Error searching profiles" }),
  });

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search for a username..."
      onSearchTextChange={(query) => setQuery(query.trim())}
    >
      <List.Section title={query === "" ? "Latest Searches" : countOf(results.length, "result")}>
        {results.map((entry) => {
          return (
            <List.Item
              key={entry.uuid}
              icon={{
                source: "https://laby.net/texture/profile/head/" + entry.uuid + ".png?size=32",
                mask: Image.Mask.RoundedRectangle,
                fallback: Icon.PersonCircle,
              }}
              title={entry.userName}
              subtitle={entry.uuid}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push title="Show Profile" target={<ProfileView uuid={entry.uuid} />} icon={Icon.Person} />
                    <Action.CopyToClipboard
                      title="Copy UUID"
                      content={entry.uuid}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Remove from Search History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        try {
                          await service.removeSearch(entry.uuid);
                          await revalidate();
                        } catch (error) {
                          await showError(error, { title: "Could not remove search history item" });
                        }
                      }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
