import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Clipboard, Icon, getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { identifyPhonePrefix, type CountryInfo } from "./utils/phone";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const selected = await getSelectedText();
        if (selected?.trim()) {
          setSearchText(selected.trim());
          return;
        }
      } catch {
        // nothing selected — fall through to clipboard
      }
      try {
        const text = await Clipboard.readText();
        if (text?.trim()) setSearchText(text.trim());
      } catch (error) {
        showFailureToast(error, { title: "Could not read clipboard" });
      }
    })().finally(() => setIsLoading(false));
  }, []);

  const match: CountryInfo | null = searchText.length > 0 ? identifyPhonePrefix(searchText) : null;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste or type a phone number (e.g. +33 6 12 34 56 78)"
      filtering={false}
      navigationTitle="Identify Phone Country"
    >
      {match ? (
        <List.Item
          title={`${match.flag}  ${match.name}`}
          subtitle={match.dialCode}
          accessories={[{ icon: Icon.Phone, text: match.dialCode }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Country Name" content={match.name} />
              <Action.CopyToClipboard title="Copy Dial Code" content={match.dialCode} />
              <Action.CopyToClipboard title="Copy Flag" content={match.flag} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Phone}
          title={searchText.length > 0 ? "Unknown Prefix" : "Enter a Phone Number"}
          description={
            searchText.length > 0
              ? "No country matches this prefix — check the number and try again"
              : "Paste or type a phone number to identify its origin country"
          }
        />
      )}
    </List>
  );
}
