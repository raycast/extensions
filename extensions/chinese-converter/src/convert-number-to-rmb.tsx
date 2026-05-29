import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, LaunchProps, List, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { convert2rmb, createNzh, parsePreferences } from "./core/rmb-converter-core";

export default function ConvertToRmb(props: LaunchProps<{ arguments: { number?: string } }>) {
  const preferences = getPreferenceValues<Preferences.ConvertNumberToRmb>();
  const [searchText, setSearchText] = useState(props.arguments.number ?? "");

  const { decimalPlaces, roundingMode, moneyPrefix, yuanChar, zhengChar, moneyOptions } = useMemo(
    () => parsePreferences(preferences),
    [preferences],
  );

  const nzh = useMemo(() => createNzh({ moneyPrefix, yuanChar, zhengChar }), [moneyPrefix, yuanChar, zhengChar]);
  const trimmedInput = searchText.trim();

  useEffect(() => {
    if (!preferences.autoReadClipboard || props.arguments.number) {
      return;
    }

    let isMounted = true;

    async function readClipboardText() {
      const clipboardText = (await Clipboard.readText())?.trim();
      const clipboardNumber = Number.parseFloat(clipboardText ?? "");

      if (isMounted && clipboardText && !Number.isNaN(clipboardNumber)) {
        setSearchText(String(clipboardNumber));
      }
    }

    readClipboardText();

    return () => {
      isMounted = false;
    };
  }, [preferences.autoReadClipboard, props.arguments.number]);

  const parsed = useMemo(
    () => convert2rmb(trimmedInput, { decimalPlaces, roundingMode, moneyOptions, nzh }),
    [trimmedInput, decimalPlaces, roundingMode, moneyOptions.unOmitYuan, moneyOptions.forceZheng, nzh],
  );

  return (
    <List searchBarPlaceholder="Enter a number" searchText={searchText} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Result">
        <List.Item
          title={parsed.state === "ok" ? parsed.rmbValue : parsed.state === "idle" ? "Enter a number" : "Invalid input"}
          subtitle={
            parsed.state === "ok" && parsed.roundedValue !== trimmedInput
              ? parsed.roundedValue
              : parsed.state === "error"
                ? parsed.message
                : undefined
          }
          icon={
            parsed.state === "ok" ? Icon.BankNote : parsed.state === "error" ? Icon.ExclamationMark : Icon.TextInput
          }
          actions={
            <ActionPanel>
              {parsed.state === "ok" ? (
                <>
                  <Action.CopyToClipboard title="Copy Result" content={parsed.rmbValue} />
                  <Action
                    title="Paste Result"
                    icon={Icon.TextInput}
                    onAction={() => {
                      Clipboard.paste(parsed.rmbValue);
                    }}
                  />
                </>
              ) : (
                <Action
                  title="Copy Result"
                  icon={Icon.Clipboard}
                  onAction={() => {
                    if (parsed.state === "idle") {
                      showFailureToast(parsed.message, { title: "" });
                      return;
                    }

                    if (parsed.state === "error") {
                      showFailureToast(parsed.message, { title: "Invalid Input" });
                    }
                  }}
                />
              )}
              <ActionPanel.Section title="Feedback">
                <Action.OpenInBrowser
                  title="Report Issue"
                  url="https://github.com/tofrankie/raycast-chinese-converter/issues"
                />
                <Action
                  title="Contact Author"
                  icon={Icon.Envelope}
                  onAction={() => open("mailto:1426203851@qq.com?subject=RMB%20Converter%20Feedback")}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
