import { Action, ActionPanel, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { WorkspacePicker } from "./components/workspace-picker.tsx";
import { getFinderDirs } from "./lib/finder.ts";
import { listCards, openFolders } from "./lib/ift.ts";
import { cardDirs, expandHome } from "./lib/parse.ts";

type Values = { dir: string; custom: string };

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

// The typed path wins over the dropdown. A bad path is reported here, before a workspace is asked for.
async function chosenDir(values: Values): Promise<string | undefined> {
  const dir = values.custom.trim() ? expandHome(values.custom, homedir()) : values.dir;
  if (isDirectory(dir)) return dir;
  await showToast({ style: Toast.Style.Failure, title: "Not a directory", message: dir });
  return undefined;
}

// Raycast's file picker always opens in Downloads, so offer the places a terminal usually starts in instead:
// home, a few standard folders, the Finder folder, and the directories your open cards already use.
export default function Command() {
  const { push } = useNavigation();
  const home = homedir();
  // Both lookups may fail (Finder not frontmost, app closed); the dropdown then has the standard places only.
  const { data: finder = [] } = useCachedPromise(() => getFinderDirs().catch(() => [] as string[]));
  const { data: cards = [] } = useCachedPromise(() => listCards().catch(() => []));

  const common = [home, join(home, "Desktop"), join(home, "Documents"), join(home, "Downloads")].filter(isDirectory);
  const seen = new Set([...common, ...finder]);
  const open = cardDirs(cards, home).filter((d) => !seen.has(d) && isDirectory(d));
  const label = (d: string) => (d === home ? "~" : d.startsWith(home + "/") ? "~" + d.slice(home.length) : d);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Choose Workspace"
            icon={Icon.ArrowRight}
            onSubmit={async (values: Values) => {
              const dir = await chosenDir(values);
              if (dir) push(<WorkspacePicker dirs={[dir]} title={basename(dir) || dir} />);
            }}
          />
          <Action.SubmitForm
            title="Open in Current Workspace"
            icon={Icon.Window}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            onSubmit={async (values: Values) => {
              const dir = await chosenDir(values);
              if (dir) await openFolders([dir]);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="dir" title="Directory" defaultValue={home}>
        {finder.length > 0 && (
          <Form.Dropdown.Section title="Finder">
            {finder.map((d) => (
              <Form.Dropdown.Item key={d} value={d} title={label(d)} icon={Icon.Finder} />
            ))}
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section title="Places">
          {common.map((d) => (
            <Form.Dropdown.Item key={d} value={d} title={label(d)} icon={Icon.Folder} />
          ))}
        </Form.Dropdown.Section>
        {open.length > 0 && (
          <Form.Dropdown.Section title="Open Cards">
            {open.map((d) => (
              <Form.Dropdown.Item key={d} value={d} title={label(d)} icon={Icon.Terminal} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TextField id="custom" title="Other Path" placeholder="Optional, overrides the list, ~ allowed" />
    </Form>
  );
}
