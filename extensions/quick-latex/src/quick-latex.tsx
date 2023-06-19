import { Action, ActionPanel, environment, List, popToRoot, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { runAppleScript } from "run-applescript";
import { image } from "image-downloader";

const downloadDir = resolve(environment.supportPath, "download");
const latexUrl = "https://latex.codecogs.com/png.image?" + encodeURIComponent("\\dpi{512}");
const latexUrlDark = "https://latex.codecogs.com/png.image?" + encodeURIComponent("\\dpi{512}\\bg{black}\\fg{white}");
console.log(latexUrl);
export default function CommandWithCustoEmptyView() {
  const [state, setState] = useState({ searchText: "LaTeX", items: [] });
  useEffect(() => {
    // perform an API call that eventually populates `items`.
    if (!existsSync(downloadDir)) {
      mkdirSync(downloadDir, { recursive: true });
    }
  }, [state.searchText]);

  return (
    <List onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText != ""
        ? (downloadlatex(latexUrl + encodeURIComponent(state.searchText)),
          (
            <List.EmptyView
              icon={{
                source: {
                  light: latexUrl + encodeURIComponent(state.searchText),
                  dark: latexUrlDark + encodeURIComponent(state.searchText),
                },
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy LaTeX Image to Clipboard"
                    onAction={() => {
                      runAppleScript(`set the clipboard to POSIX file "${downloadDir}/img.jpg"`),
                        popToRoot(),
                        showHUD("Copied");
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
        : state.items.map((item) => <List.Item key={item} title={item} />)}
    </List>
  );
  function downloadlatex(url: string) {
    image({ url: url, dest: downloadDir + "/img.jpg" }).catch(() => {
      console.log("Error check your internet connection.");
    });
  }
}
