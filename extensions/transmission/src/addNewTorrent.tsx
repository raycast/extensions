import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
  Clipboard,
  Icon,
} from "@raycast/api";
import { useState, useCallback, useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import expandTidle from "expand-tilde";
import { createClient } from "./modules/client";
import { useAsync } from "react-use";
import { runAppleScript } from "run-applescript";
import path from "path";

const preferences = getPreferenceValues();

export default function AddNewTorrent() {
  const [downloadDir, setDownloadDir] = useState("");
  const [input, setInput] = useState("");
  const transmission = useMemo(() => createClient(), []);

  const handleSubmit = useCallback(async (values: { input: string; downloadDir: string }) => {
    const resolvedDownloadDir = expandTidle(path.resolve(values.downloadDir));
    try {
      if (values.input.startsWith("magnet:")) {
        await transmission.addUrl(values.input, {
          "download-dir": resolvedDownloadDir,
        });
      } else {
        await transmission.add(expandTidle(values.input), {
          "download-dir": resolvedDownloadDir,
        });
      }

      showToast(Toast.Style.Success, `Torrent added to your list`);

      popToRoot({ clearSearchBar: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      showToast(Toast.Style.Failure, `The torrent couldn't be added: ${error.toString().slice("Error: ".length)}`);
    }
  }, []);

  const textFromClipboard = useAsync(async () => {
    const text = await Clipboard.readText();
    return text?.startsWith("magnet:") || text?.endsWith(".torrent") ? text : undefined;
  }, []);

  // Very convoluted way to prompt user for a file path since Raycast doesn't support
  // this operation natively
  const handleSelectFromFinder = useCallback(async () => {
    const path = await runAppleScript(`
      set chosenFile to choose file with prompt "Please select a .torrent file:"  of type {"torrent"}
      set raycastPath to POSIX path of (path to application "Raycast")
      do shell script "open " & raycastPath
      return POSIX path of chosenFile
    `);
    if (path) {
      setInput(path);
    }
  }, []);

  // `defaultValue` is ignored if it's `undefined` while the form is loading, bug?
  if (textFromClipboard.loading) return <Form />;

  return (
    <Form
      isLoading={textFromClipboard.loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Torrent" onSubmit={handleSubmit} />
          <Action
            icon={Icon.Finder}
            title="Select Torrent From Finder..."
            shortcut={{ key: "o", modifiers: ["cmd"] }}
            onAction={handleSelectFromFinder}
          />
          <ActionPanel.Submenu icon={Icon.Text} title="Insert Quick Path" shortcut={{ key: "q", modifiers: ["cmd"] }}>
            {preferences.quickPaths
              .split(",")
              .map((path: string) => path.trim())
              .map((path: string, index: number) => (
                <Action key={index} title={path} onAction={() => setDownloadDir(path)} />
              ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Magnet Link or Torrent File"
        id="input"
        placeholder="magnet: (or ⌘ O to select from Finder)"
        value={input}
        onChange={(value) => setInput(value)}
      />
      <Form.TextField
        title="Download Directory"
        id="downloadDir"
        placeholder="~/Downloads (⌘ Q to insert from quick paths)"
        value={downloadDir}
        onChange={setDownloadDir}
      />
    </Form>
  );
}
