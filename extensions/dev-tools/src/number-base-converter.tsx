import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { BASES, type Base, LABEL, format, parse, toUnicode, withPrefix } from "./lib/number-base";

type Source = Base | "auto";

export default function Command() {
  const { defaultBase } = getPreferenceValues<Preferences.NumberBaseConverter>();
  const [searchText, setSearchText] = useState("");
  const [source, setSource] = useState<Source>(defaultBase);

  // Prefill from the clipboard on open, but only if it actually parses as a number.
  useEffect(() => {
    (async () => {
      const clipboard = (await Clipboard.readText())?.trim();
      if (!clipboard) return;
      try {
        parse(clipboard, "auto");
        setSearchText(clipboard);
      } catch {
        // Clipboard isn't a number — leave the field empty.
      }
    })();
  }, []);

  const parsed = useMemo<{ value: bigint } | { error: string } | null>(() => {
    if (!searchText.trim()) return null;
    try {
      return { value: parse(searchText, source) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [searchText, source]);

  const value = parsed && "value" in parsed ? parsed.value : null;
  const unicode = value !== null ? toUnicode(value) : null;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a number — 0x, 0b, 0o prefixes are auto-detected"
      searchBarAccessory={
        <List.Dropdown tooltip="Source base" value={source} onChange={(next) => setSource(next as Source)}>
          <List.Dropdown.Item title="Auto-detect" value="auto" />
          <List.Dropdown.Section title="Force source base">
            {BASES.map((base) => (
              <List.Dropdown.Item key={base} title={LABEL[base]} value={base} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {value !== null ? (
        <>
          {BASES.map((base) => {
            const plain = format(value, base);
            const prefixed = withPrefix(value, base);
            return (
              <List.Item
                key={base}
                icon={Icon.Hashtag}
                title={LABEL[base]}
                subtitle={prefixed}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title={`Copy ${LABEL[base]}`} content={prefixed} />
                    {prefixed !== plain && <Action.CopyToClipboard title="Copy Without Prefix" content={plain} />}
                  </ActionPanel>
                }
              />
            );
          })}
          {unicode && (
            <List.Item
              icon={Icon.Text}
              title="Unicode"
              subtitle={
                unicode.isControl ? `${unicode.codePoint} (control character)` : `${unicode.char}  ${unicode.codePoint}`
              }
              actions={
                <ActionPanel>
                  {!unicode.isControl && <Action.CopyToClipboard title="Copy Character" content={unicode.char} />}
                  <Action.CopyToClipboard title="Copy Code Point" content={unicode.codePoint} />
                </ActionPanel>
              }
            />
          )}
        </>
      ) : (
        <List.EmptyView
          icon={parsed && "error" in parsed ? Icon.ExclamationMark : Icon.Hashtag}
          title={parsed && "error" in parsed ? parsed.error : "Type or paste a number"}
          description={
            parsed && "error" in parsed ? "Check the source base." : "Examples: 255, 0xFF, 0b1011, 0o17, 65 → A"
          }
        />
      )}
    </List>
  );
}
