import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useRef, useState } from "react";
import { type HistoryRange, historyStats } from "./utils/history";
import { exportIntakes, parseIntakeExport } from "./utils/intakeData";
import { historyMarkdown } from "./utils/statsSvg";
import { getIntakes, mergeIntakes } from "./utils/storage";

function TransferHistory({ kind, onImport }: { kind: "import" | "export"; onImport: () => void }) {
  const { pop } = useNavigation();
  const exporting = kind === "export";
  const transferring = useRef(false);

  async function transfer({ paths }: { paths: string[] }) {
    if (transferring.current) return;
    const path = paths?.[0];
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: exporting ? "Choose a destination folder" : "Choose a history file",
      });
      return;
    }

    transferring.current = true;
    try {
      if (exporting) {
        const filename = `no-more-caffeine-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        await writeFile(join(path, filename), exportIntakes(await getIntakes()), { flag: "wx", mode: 0o600 });
        await showToast({ style: Toast.Style.Success, title: "History exported", message: filename });
      } else {
        const incoming = parseIntakeExport(await readFile(path, "utf8"));
        const imported = await mergeIntakes(incoming);
        onImport();
        await showToast({
          style: Toast.Style.Success,
          title: imported ? `Imported ${imported} ${imported === 1 ? "entry" : "entries"}` : "No new entries to import",
          message: incoming.length > imported ? `${incoming.length - imported} duplicate IDs skipped` : undefined,
        });
      }
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: exporting ? "Couldn’t export history" : "Couldn’t import history",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      transferring.current = false;
    }
  }

  const actionTitle = exporting ? "Export History" : "Import History";
  return (
    <Form
      navigationTitle={actionTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={actionTitle} onSubmit={transfer} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          exporting
            ? "Save your full intake history as a JSON file."
            : "Merge a JSON export into your current history. Entries with matching IDs are skipped."
        }
      />
      <Form.FilePicker
        id="paths"
        title={exporting ? "Destination Folder" : "History File"}
        allowMultipleSelection={false}
        canChooseFiles={!exporting}
        canChooseDirectories={exporting}
      />
    </Form>
  );
}

const ranges: { value: HistoryRange; label: string; description: string }[] = [
  { value: "day", label: "Daily", description: "Today’s logged intake by local hour." },
  { value: "week", label: "Weekly", description: "Logged intake over the last 7 calendar days, including today." },
  { value: "month", label: "Monthly", description: "Logged intake over the last 30 calendar days, including today." },
];

export default function CaffeineHistory({ launchContext }: { launchContext?: { range?: unknown } } = {}) {
  const { data: intakes, isLoading, revalidate, error } = useCachedPromise(getIntakes);
  const [rangeIndex, setRangeIndex] = useState(() => {
    const index = ranges.findIndex(({ value }) => value === launchContext?.range);
    return index === -1 ? 1 : index;
  });
  const range = ranges[rangeIndex];
  const data = intakes && historyStats(intakes, range.value);

  return (
    <Detail
      navigationTitle={`Caffeine History · ${range.label}`}
      isLoading={isLoading}
      markdown={
        data
          ? [historyMarkdown(data, environment.appearance), range.description].join("\n\n")
          : error
            ? "The intake history couldn’t be loaded."
            : ""
      }
      actions={
        <ActionPanel>
          <Action
            title={`Show ${ranges[(rangeIndex + 1) % ranges.length].label} History`}
            icon={Icon.Calendar}
            onAction={() => setRangeIndex((rangeIndex + 1) % ranges.length)}
          />
          <ActionPanel.Submenu title="Choose Date Range" icon={Icon.Calendar}>
            {ranges.map(({ label, value }, index) => (
              <Action key={value} title={label} onAction={() => setRangeIndex(index)} />
            ))}
          </ActionPanel.Submenu>
          <Action.Push
            title="Export History"
            icon={Icon.Download}
            target={<TransferHistory kind="export" onImport={revalidate} />}
          />
          <Action.Push
            title="Import History"
            icon={Icon.Upload}
            target={<TransferHistory kind="import" onImport={revalidate} />}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
