import {
  Clipboard,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { readSavedResults } from "./lib/saved-results";
import {
  buildPinnedItems,
  type PinnedExpression,
} from "./lib/pinned-expressions-model";
import { saveToFloatingNote } from "./lib/floating-note";

export default function Command() {
  const [items, setItems] = useState<PinnedExpression[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void readSavedResults()
      .then((saved) => {
        if (active) setItems(buildPinnedItems(saved));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <MenuBarExtra
      icon={Icon.SpeechBubble}
      isLoading={isLoading}
      tooltip="Saved Expressions"
    >
      {items.length === 0 ? (
        <MenuBarExtra.Item title="No saved expressions yet" />
      ) : (
        <MenuBarExtra.Section title="Saved Expressions">
          {items.map((item) => (
            <MenuBarExtra.Submenu key={item.id} title={item.primary}>
              <MenuBarExtra.Item
                title="Copy"
                icon={Icon.CopyClipboard}
                onAction={() => void copyExpression(item.primary)}
              />
              <MenuBarExtra.Item
                title="Save to Floating Note"
                icon={Icon.Window}
                onAction={() =>
                  void saveToFloatingNote({
                    expression: item.primary,
                    source: item.source,
                    coaching: item.coaching,
                  })
                }
              />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Saved Results"
          icon={Icon.List}
          onAction={() =>
            void launchCommand({
              name: "saved-results",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function copyExpression(text: string): Promise<void> {
  await Clipboard.copy(text);
  await showHUD("Copied to clipboard");
}
