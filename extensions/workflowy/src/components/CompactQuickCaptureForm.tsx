import { Action, ActionPanel, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { QuickCaptureForm } from "./QuickCaptureForm";
import { insertNode } from "../lib/api";
import { insertNodeOptimistically } from "../lib/cache";
import { listCaptureDestinationOptions, resolveDefaultCaptureDestination } from "../lib/capture-options";
import { getPreferences } from "../lib/preferences";
import type { CaptureType } from "../lib/nodes";

export function CompactQuickCaptureForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferences();
  const options = useMemo(listCaptureDestinationOptions, []);
  const defaultDestination = useMemo(
    () => resolveDefaultCaptureDestination(preferences.quickCaptureDefaultTarget),
    [preferences.quickCaptureDefaultTarget],
  );
  const [selectedDestinationValue, setSelectedDestinationValue] = useState(
    options.find((option) => option.value === defaultDestination.value)?.value ??
      options.find((option) => option.target === defaultDestination.target)?.value ??
      options.find((option) => option.target === "inbox")?.value ??
      options[0]?.value ??
      defaultDestination.value,
  );
  const [captureType, setCaptureType] = useState<CaptureType>(preferences.quickCaptureDefaultType);

  const selectedDestination =
    options.find((option) => option.value === selectedDestinationValue) ?? defaultDestination;
  const captureTypeLabel = captureType === "todo" ? "Todo" : "Bullet";
  const trimmedText = searchText.trim();

  async function submitCapture() {
    if (!trimmedText) {
      await showToast({ style: Toast.Style.Failure, title: "Text is required" });
      return;
    }

    try {
      setIsLoading(true);
      const result = await insertNode(preferences.apiKey, {
        target: selectedDestination.target,
        targetNodeId: selectedDestination.targetNodeId,
        text: trimmedText,
        position: preferences.capturePosition,
        type: captureType,
      });

      if (result.id && result.parentId) {
        insertNodeOptimistically({
          id: result.id,
          name: trimmedText,
          note: null,
          parentId: result.parentId,
        });
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Added to ${selectedDestination.title}`,
        message: captureTypeLabel,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not add item",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Capture to ${selectedDestination.title} as ${captureTypeLabel.toLowerCase()}…`}
      searchBarAccessory={
        <List.Dropdown tooltip="Destination" value={selectedDestinationValue} onChange={setSelectedDestinationValue} filtering>
          {["System", "Workflowy Shortcuts", "My Bookmarks", "Configured Default"].map((sectionTitle) => {
            const sectionOptions = options.filter((option) => option.section === sectionTitle);
            if (sectionOptions.length === 0) return null;
            return (
              <List.Dropdown.Section key={sectionTitle} title={sectionTitle}>
                {sectionOptions.map((option) => (
                  <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
                ))}
              </List.Dropdown.Section>
            );
          })}
        </List.Dropdown>
      }
    >
      <List.Item
        id="capture"
        icon={captureType === "todo" ? Icon.CheckCircle : Icon.BulletPoints}
        title={trimmedText || "Type above to capture"}
        subtitle={trimmedText ? `Add to ${selectedDestination.title}` : "Type above, then press Enter"}
        accessories={[
          { text: selectedDestination.title, tooltip: "Destination" },
          { text: captureTypeLabel, tooltip: "Type" },
        ]}
        actions={
          <ActionPanel>
            <Action title={`Capture to ${selectedDestination.title}`} onAction={submitCapture} />
            <Action
              title={`Switch to ${captureType === "todo" ? "Bullet" : "Todo"}`}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => setCaptureType((current) => (current === "todo" ? "bullet" : "todo"))}
            />
            <Action.Push
              title="Open Capture Form"
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
              target={
                <QuickCaptureForm
                  initialText={trimmedText}
                  initialDestinationValue={selectedDestinationValue}
                  initialType={captureType}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
