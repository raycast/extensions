import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, closeMainWindow, showHUD } from "@raycast/api";
import { getTransientCopyPreference } from "~/utils/preferences";
import { capitalize } from "~/utils/strings";
import { SHORTCUT_KEY_SEQUENCE } from "~/constants/general";
import { useMemo } from "react";

type Constraint = RecordOfAny;

export type ShowDetailsScreenProps<TDetails extends Constraint = Constraint> = {
  details: TDetails;
  label: string;
  itemName: string;
  sorter?: (a: string | [string, any], b: string | [string, any]) => number;
  getMarkdown: (itemName: string, details: TDetails) => string;
  getCopyValue: (details: TDetails) => string;
  titleMap?: Record<keyof TDetails, string> | ((key: keyof TDetails) => string);
};

function ShowDetailsScreen<TDetails extends Constraint>(props: ShowDetailsScreenProps<TDetails>) {
  const { itemName, details, sorter, label, getMarkdown, getCopyValue, titleMap } = props;
  const capitalizedLabel = capitalize(label, true);

  const handleCopyField = (value: string) => async () => {
    await Clipboard.copy(value, { transient: getTransientCopyPreference("other") });
    await showHUD("Copied to clipboard");
    await closeMainWindow();
  };

  const { sortedDetails, sortedDetailsEntries } = useMemo(() => {
    if (!sorter) return { sortedDetails: details, sortedDetailsEntries: Object.entries(details) };

    const sortedEntries: [string, string][] = Object.entries(details).sort(sorter);
    return {
      sortedDetails: Object.fromEntries(sortedEntries) as unknown as TDetails,
      sortedDetailsEntries: sortedEntries,
    };
  }, [details]);

  return (
    <Detail
      markdown={getMarkdown(itemName, sortedDetails)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={`Copy ${capitalizedLabel} Details`}
              content={getCopyValue(sortedDetails)}
              transient={getTransientCopyPreference("other")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={`${capitalizedLabel} Fields`}>
            {sortedDetailsEntries.map(([fieldKey, content], index) => {
              if (!content) return null;
              const shortcutKey = SHORTCUT_KEY_SEQUENCE[index];

              return (
                <Action
                  key={`${index}-${fieldKey}`}
                  title={`Copy ${getTitle(fieldKey, titleMap)}`}
                  icon={Icon.Clipboard}
                  onAction={handleCopyField(content)}
                  shortcut={shortcutKey ? { modifiers: ["cmd"], key: shortcutKey } : undefined}
                />
              );
            })}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getTitle(fieldKey: string, titleMap?: ShowDetailsScreenProps["titleMap"]) {
  if (!titleMap) return capitalize(fieldKey, true);
  if (typeof titleMap === "function") return titleMap(fieldKey);

  return titleMap[fieldKey];
}

export default ShowDetailsScreen;
