import { useState, useEffect } from "react";
import { ActionPanel, Action, Grid, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface Preferences {
  ["gif-library-path"]: string;
}

interface State {
  gifs: string[];
}

const getGifs = async (path: string): Promise<string[]> => {
  const script = `set GifFolder to ("file://${path}") as POSIX file as alias
  tell application "Finder"
    set file_list to name of every file of entire contents of (GifFolder)
  end tell`;

  const res = await runAppleScript(script);

  return res
    .split(", ")
    .filter((g: string) => g.includes(".gif"))
    .map((gif: string) => `${path}/${gif}`);
};

const copyGifToClipboard = async (file: string) => {
  await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${file}" )`);
  await closeMainWindow({ clearRootSearch: true });
  await showToast({ style: Toast.Style.Success, title: `Copied GIF to clipboard` });
};

export default function Command() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const [state, setState] = useState<State>({ gifs: [] });

  const preferences = getPreferenceValues<Preferences>();
  const path = preferences["gif-library-path"];

  useEffect(() => {
    async function findGifs() {
      const gifs = await getGifs(path);
      setState({ gifs });
    }

    findGifs();
  }, []);

  return (
    <Grid
      itemSize={itemSize}
      inset={Grid.Inset.Medium}
      isLoading={!state.gifs.length}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
        </Grid.Dropdown>
      }
    >
      {state.gifs.map((gif: string) => (
        <Grid.Item
          key={gif}
          content={gif}
          title={gif.replace(`${path}/`, "").replace(".gif", "")}
          actions={
            <ActionPanel>
              <Action title="Copy to Clipboard" onAction={() => copyGifToClipboard(gif)} />
              <Action.ShowInFinder title="Show in Finder" path={gif} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
