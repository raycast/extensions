import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Clipboard, Icon, getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { extractPhoneNumbers, toE164, identifyPhonePrefix } from "./utils/phone";

interface PhoneEntry {
  raw: string;
  e164: string | null;
  flag: string;
  countryName: string;
}

export default function Command() {
  const [entries, setEntries] = useState<PhoneEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hadText, setHadText] = useState(false);

  useEffect(() => {
    (async () => {
      let text: string | null = null;
      try {
        const selected = await getSelectedText();
        if (selected?.trim()) text = selected.trim();
      } catch {
        // fall through
      }
      if (!text) {
        try {
          const clip = await Clipboard.readText();
          if (clip?.trim()) text = clip.trim();
        } catch (err) {
          await showFailureToast(err, { title: "Could not read clipboard" });
        }
      }

      if (text) {
        setHadText(true);
        const raws = extractPhoneNumbers(text);
        const parsed: PhoneEntry[] = raws.map((raw) => {
          const e164 = toE164(raw);
          const info = e164 ? identifyPhonePrefix(e164) : identifyPhonePrefix(raw);
          return {
            raw,
            e164,
            flag: info?.flag ?? "📞",
            countryName: info?.name ?? "Unknown",
          };
        });
        setEntries(parsed);
      }
    })().finally(() => setIsLoading(false));
  }, []);

  const allE164 = entries.map((e) => e.e164 ?? e.raw).join("\n");

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      navigationTitle="Extract Phone Numbers"
      searchBarPlaceholder="Filter extracted numbers"
    >
      {entries.length > 0 ? (
        <>
          {entries.map((entry, idx) => (
            <List.Item
              key={idx}
              title={entry.e164 ?? entry.raw}
              subtitle={`${entry.flag}  ${entry.countryName}`}
              accessories={entry.e164 && entry.e164 !== entry.raw ? [{ text: entry.raw }] : []}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy E.164" content={entry.e164 ?? entry.raw} />
                  {entry.e164 && entry.e164 !== entry.raw && (
                    <Action.CopyToClipboard title="Copy Original" content={entry.raw} />
                  )}
                  <Action.CopyToClipboard title="Copy All Numbers" content={allE164} />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView
          icon={Icon.Phone}
          title={hadText ? "No Phone Numbers Found" : "No Text Available"}
          description={
            hadText
              ? "No recognizable phone numbers in the text — try selecting text that contains phone numbers"
              : "Select or copy text containing phone numbers, then invoke this command"
          }
        />
      )}
    </List>
  );
}
