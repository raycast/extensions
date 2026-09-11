import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  showToast,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { downloadWithToast } from "./download";
import {
  DICTIONARIES,
  hasOfflineData,
  installedCounts,
  removeOfflineData,
  SOURCES,
  TOTAL_BYTES,
} from "./offline";

export default function ManageDictionaries() {
  const dir = environment.supportPath;
  const [hasData, setHasData] = useState(() => hasOfflineData(dir));
  const [isBusy, setBusy] = useState(false);
  const counts = hasData ? installedCounts(dir) : undefined;

  const download = useCallback(async () => {
    setBusy(true);
    const installed = await downloadWithToast(dir);
    setHasData(installed);
    setBusy(false);
  }, [dir]);

  const remove = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Delete dictionaries?",
      message:
        "Frees about 40 MB. Lookups stop working until you download it again.",
      icon: Icon.Trash,
    });
    if (!confirmed) return;
    try {
      await removeOfflineData(dir);
      setHasData(false);
      await showToast({ title: "Dictionaries deleted" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete dictionaries",
        message: String(error),
      });
    }
  }, [dir]);

  const actions = (
    <ActionPanel>
      <Action
        title={hasData ? "Download Again" : "Download Dictionaries"}
        icon={Icon.Download}
        onAction={download}
      />
      {hasData && !isBusy && (
        <Action
          title="Delete Dictionaries"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={remove}
        />
      )}
    </ActionPanel>
  );

  return (
    <List isLoading={isBusy}>
      <List.Section
        title="Dictionaries"
        subtitle={hasData ? "Installed" : `${mb(TOTAL_BYTES)} MB to download`}
      >
        {DICTIONARIES.map((dictionary) => (
          <List.Item
            key={dictionary.source}
            icon={
              hasData
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Circle
            }
            title={SOURCES[dictionary.source]}
            subtitle={dictionary.supplies.join(" · ")}
            accessories={[
              {
                text: counts
                  ? `${counts[dictionary.source].toLocaleString()} entries`
                  : `${mb(dictionary.bytes)} MB`,
              },
              { tag: dictionary.licence },
            ]}
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  );
}

const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);
