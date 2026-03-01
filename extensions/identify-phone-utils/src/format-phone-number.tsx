import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Clipboard, Icon, getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { stripFormatting, formatAsUS, toE164, toRFC3966 } from "./utils/phone";

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

  const digitsOnly = searchText.length > 0 ? stripFormatting(searchText) : null;
  const e164 = searchText.length > 0 ? toE164(searchText) : null;
  const usFormat = searchText.length > 0 ? formatAsUS(searchText) : null;
  const rfc3966 = searchText.length > 0 ? toRFC3966(searchText) : null;

  const hasDigits = digitsOnly && digitsOnly.replace(/\D/g, "").length > 0;

  const formats: Array<{ name: string; value: string | null }> = [
    { name: "Digits Only", value: hasDigits ? digitsOnly : null },
    { name: "E.164", value: e164 },
    { name: "US Format", value: usFormat },
    { name: "RFC 3966", value: rfc3966 },
  ];

  const visibleFormats = formats.filter((f) => f.value !== null);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste or type a phone number to format"
      filtering={false}
      navigationTitle="Format Phone Number"
    >
      {visibleFormats.length > 0 ? (
        visibleFormats.map(({ name, value }) => (
          <List.Item
            key={name}
            title={name}
            accessories={[{ icon: Icon.Clipboard, text: value! }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy ${name}`} content={value!} />
                <Action.Paste title={`Paste ${name}`} content={value!} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Phone}
          title={searchText.length > 0 ? "No Digits Found" : "Enter a Phone Number"}
          description={
            searchText.length > 0
              ? "No recognizable digits in input — try a phone number like +33 6 12 34 56 78"
              : "Paste or type a phone number to see available formats"
          }
        />
      )}
    </List>
  );
}
