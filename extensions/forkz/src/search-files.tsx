import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";
import { homedir } from "os";
import { useState } from "react";
import { openLink } from "./forkz";

/** forkz's kinds (as forkz://search names them). */
const KINDS: [string, string][] = [
  ["", "Any kind"],
  ["folders", "Folders"],
  ["files", "Files"],
  ["images", "Images"],
  ["movies", "Movies"],
  ["audio", "Music and audio"],
  ["documents", "Documents"],
  ["archives", "Archives"],
  ["code", "Source code"],
];

const DATES: [string, string][] = [
  ["", "Any date"],
  ["1", "In the last day"],
  ["7", "In the last 7 days"],
  ["30", "In the last 30 days"],
  ["365", "In the last 12 months"],
];

interface Values {
  text: string;
  folder: string[];
  contents: boolean;
  kind: string;
  larger: string;
  days: string;
}

/** The folder of Finder's front window, if there is one. */
async function frontFinderFolder(): Promise<string | undefined> {
  try {
    const path = await runAppleScript(
      'tell application "Finder" to if (count of Finder windows) > 0 then return POSIX path of (target of front Finder window as alias)',
    );
    return path.trim() || undefined;
  } catch {
    return undefined;
  }
}

export default function Command() {
  // The folder chosen in the form; until then, where Finder is (else home).
  // A late answer from Finder never replaces a folder the user chose.
  const [chosen, setChosen] = useState<string[]>();
  const { data: finder, isLoading } = usePromise(frontFinderFolder);
  const folder = chosen ?? [finder ?? homedir()];

  async function search(values: Values) {
    const parameters: Record<string, string> = { path: values.folder[0] ?? homedir() };
    if (values.text.trim()) parameters.text = values.text.trim();
    if (values.contents) parameters.contents = "1";
    if (values.kind) parameters.kind = values.kind;
    if (values.larger.trim()) parameters.larger = values.larger.trim().replace(/\s+/g, "");
    if (values.days) parameters.days = values.days;
    if (Object.keys(parameters).length === 1) {
      await showToast({ style: Toast.Style.Failure, title: "Type something, or choose a kind, size, or date" });
      return;
    }
    await openLink("search", parameters);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {/* eslint-disable-next-line @raycast/prefer-title-case -- forkz is the app's name, lowercase */}
          <Action.SubmitForm title="Search in forkz" icon={Icon.MagnifyingGlass} onSubmit={search} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Find" placeholder="report, *.pdf, or words in files" autoFocus />
      <Form.Checkbox id="contents" title="" label="Search inside files" defaultValue={false} />
      <Form.FilePicker
        id="folder"
        title="In"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={folder}
        onChange={setChosen}
      />
      <Form.Dropdown id="kind" title="Kind" defaultValue="">
        {KINDS.map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="larger" title="Larger Than" placeholder="100 MB (optional)" />
      <Form.Dropdown id="days" title="Modified" defaultValue="">
        {DATES.map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
