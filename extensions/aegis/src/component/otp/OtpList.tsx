import {
  ActionPanel,
  Action,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Searcher } from "fast-fuzzy";
import OtpListItems from "./OtpListItems";
import { Service } from "../../util/service";
import { checkError, loadData } from "./otp-helpers";

export function OtpList() {
  const [items, setItems] = useState<{
    otpList: Service[];
    isLoading: boolean;
  }>({
    otpList: [],
    isLoading: true,
  });

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadData(setItems);
  }, []);

  useEffect(() => {
    checkError(items.otpList, items.isLoading);
  }, [items]);

  // Create searcher when items load
  const searcher = useMemo(
    () =>
      new Searcher(items.otpList, {
        keySelector: (item) =>
          [item.name, item.issuer, item.accountType].filter((x): x is string =>
            Boolean(x)
          ),
      }),
    [items.otpList]
  );

  // Get filtered items based on search
  const filteredItems = searchText
    ? searcher.search(searchText)
    : items.otpList;

  return (
    <List
      searchBarPlaceholder="Search"
      isLoading={items.isLoading}
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredItems.length === 0 && searchText !== "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching items found"
          description="Try a different search term"
        />
      ) : items.otpList.length === 0 ? (
        <List.EmptyView
          icon={Icon.SpeechBubbleImportant}
          title={"Add Services with Aegis"}
          description={"Then export a backup from Aegis and use it here"}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : (
        <OtpListItems items={filteredItems} setItems={setItems} />
      )}
    </List>
  );
}
