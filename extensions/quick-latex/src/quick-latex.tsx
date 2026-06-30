import { Action, ActionPanel, List, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { downloadLatex, getDisplayLatex } from "./api";
import { ExportType, makeDonwloadDir, toClipboard } from "./utils";

export default function QuickLatexCommand() {
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    makeDonwloadDir();
  }, []);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Type a LaTeX formula…" searchText={searchText}>
      <List.EmptyView
        icon={getDisplayLatex(searchText)}
        actions={
          <ActionPanel>
            {Object.values(ExportType).map((exportType) => (
              <Action
                key={exportType}
                title={"Copy as " + exportType.toUpperCase()}
                onAction={() => {
                  downloadLatex(exportType, searchText)
                    .then((path: string) => {
                      toClipboard(path);
                      popToRoot();
                      showHUD("Copied to clipboard.");
                    })
                    .catch(() => {
                      showHUD("No internet connection. Or something else.");
                    });
                }}
              />
            ))}
          </ActionPanel>
        }
      />
    </List>
  );
}
