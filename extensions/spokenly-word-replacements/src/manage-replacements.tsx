import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef } from "react";
import { AddForm } from "./components/add-form";
import { ConnectionError } from "./components/connection-error";
import { sameOriginal } from "./lib/replacements";
import { useSpokenly } from "./lib/use-spokenly";

export default function Command() {
  const { client, rules, error, isLoading, refresh } = useSpokenly();
  const removing = useRef(false);

  async function remove(original: string) {
    if (!client || removing.current) return;
    removing.current = true;
    try {
      const count = rules.filter((rule) =>
        sameOriginal(rule.original, original),
      ).length;
      if (
        !(await confirmAlert({
          title: `Remove ${count === 1 ? "this replacement" : `${count} replacements`}?`,
          message: `Spokenly removes every rule whose original equals “${original}”, ignoring case. Copy a JSON backup first if you may want to restore it.`,
          primaryAction: {
            title: "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      ) {
        return;
      }
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing replacement",
      });
      try {
        const removed = await client.remove(original);
        toast.style = Toast.Style.Success;
        toast.title = `${removed === 1 ? "Replacement" : `${removed} replacements`} removed and verified`;
        await refresh();
      } catch (failure) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not verify removal";
        toast.message =
          failure instanceof Error ? failure.message : "Refresh and try again.";
      }
    } finally {
      removing.current = false;
    }
  }

  const sharedActions = (
    <>
      <Action.Push
        title="Add Replacement"
        icon={Icon.Plus}
        target={<AddForm onSaved={refresh} />}
      />
      <Action.CopyToClipboard
        title="Copy JSON Backup"
        content={JSON.stringify(rules, null, 2)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </>
  );

  if (error) return <ConnectionError message={error} retry={refresh} />;
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search originals and replacements…"
    >
      <List.EmptyView
        title={
          isLoading ? "Reading Spokenly replacements" : "No word replacements"
        }
        description={
          isLoading ? "" : "Add a correction for words that are often misheard."
        }
        icon={Icon.Text}
        actions={<ActionPanel>{!isLoading && sharedActions}</ActionPanel>}
      />
      {rules.map((rule, index) => (
        <List.Item
          key={index}
          id={String(index)}
          title={rule.original}
          subtitle={rule.replacement || "(remove matched text)"}
          keywords={[rule.replacement]}
          icon={Icon.Text}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Replacement"
                content={rule.replacement}
              />
              {sharedActions}
              <ActionPanel.Section>
                <Action
                  title="Remove Replacement"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => remove(rule.original)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
