import { Action, ActionPanel, LaunchProps, List, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { downloadLatex, getDisplayLatex } from "./api";
import { DEFAULT_ICON, ExportType, QuickLatexArguments, makeDonwloadDir, toClipboard } from "./utils";

export default function CommandWithCustoEmptyView(props: LaunchProps<{ arguments: QuickLatexArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.latex ?? "");

  useEffect(() => {
    makeDonwloadDir();
  }, []);

  const icon = searchText == "" ? DEFAULT_ICON : getDisplayLatex(searchText);

  return (
    <List onSearchTextChange={setSearchText} searchText={searchText}>
      <List.EmptyView
        icon={icon}
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
