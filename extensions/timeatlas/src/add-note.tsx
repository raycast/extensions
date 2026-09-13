import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";
import { useEffect, useState } from "react";
import {
  checkIcloudSetup,
  ICLOUD_SETTINGS_URL,
  TIME_ATLAS_SITE,
  type IcloudSetup,
} from "./lib/icloud-status";
import { getExtensionPreferences, toLocalDateString } from "./lib/paths";

async function writeNote(
  icloudDir: string,
  dateStr: string,
  text: string,
): Promise<string> {
  const now = new Date();
  const record = {
    text,
    source: "user:raycast",
    timestamp: now.toISOString(),
    date: dateStr,
  };

  const filename = `note_${now.getTime()}.json`;
  const output = path.join(icloudDir, filename);
  await fs.writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
  return output;
}

export default function AddNoteCommand() {
  const { icloudPath } = getExtensionPreferences();
  const [setup, setSetup] = useState<IcloudSetup | null>(null);
  const [setupKey, setSetupKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await checkIcloudSetup(icloudPath);
      if (!cancelled) setSetup(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [icloudPath, setupKey]);

  async function handleSubmit(values: { text: string; date: Date | null }) {
    const text = values.text.trim();
    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "Note is empty" });
      return;
    }

    const dateStr = toLocalDateString(values.date ?? new Date());

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving note...",
    });
    try {
      const latest = await checkIcloudSetup(icloudPath);
      setSetup(latest);
      if (!latest.ok) {
        throw new Error(`${latest.title}\n\n${latest.description}`);
      }
      await writeNote(latest.path, dateStr, text);
      toast.style = Toast.Style.Success;
      toast.title = "Note added";
      toast.message = dateStr;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add note";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  const blocked = setup !== null && setup.ok === false;

  return (
    <Form
      isLoading={setup === null}
      actions={
        <ActionPanel>
          {!blocked ? (
            <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
          ) : null}
          {setup && !setup.ok && setup.issue === "no-icloud" ? (
            <Action
              title="Open System Settings"
              icon={Icon.Gear}
              onAction={() => open(ICLOUD_SETTINGS_URL)}
            />
          ) : null}
          {setup &&
          !setup.ok &&
          (setup.issue === "no-timeatlas" ||
            setup.issue === "not-directory") ? (
            <Action.OpenInBrowser
              title="Open Time Atlas Website"
              url={TIME_ATLAS_SITE}
            />
          ) : null}
          {setup ? (
            <Action.CopyToClipboard
              title="Copy Expected Folder Path"
              content={setup.path}
            />
          ) : null}
          <Action
            title="Recheck Setup"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              setSetup(null);
              setSetupKey((k) => k + 1);
            }}
          />
        </ActionPanel>
      }
    >
      {blocked ? (
        <>
          <Form.Description
            title={setup.title}
            text={`${setup.description}\n\nExpected folder:\n${setup.path}`}
          />
        </>
      ) : (
        <>
          <Form.Description text="Notes are saved to your Time Atlas iCloud folder. No extra setup needed if Time Atlas is signed in to iCloud." />
          <Form.DatePicker
            id="date"
            title="Date"
            type={Form.DatePicker.Type.Date}
            defaultValue={new Date()}
          />
          <Form.TextArea
            id="text"
            title="Note"
            placeholder="What happened?"
            enableMarkdown={false}
            autoFocus
          />
        </>
      )}
    </Form>
  );
}
