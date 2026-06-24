import { Action, ActionPanel, Image, LaunchProps, List, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { downloadLatex, getPreviewImage } from "./api";
import { ExportType, QuickLatexArguments, makeDonwloadDir, toClipboard } from "./utils";

export default function CommandWithCustoEmptyView(props: LaunchProps<{ arguments: QuickLatexArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.latex ?? "");
  const [previewImage, setPreviewImage] = useState<Image.ImageLike>();

  useEffect(() => {
    makeDonwloadDir();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const timeout = setTimeout(() => {
      getPreviewImage(searchText)
        .then((image) => {
          if (isCurrent) {
            setPreviewImage(image);
          }
        })
        .catch(() => undefined);
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [searchText]);

  return (
    <List isLoading={previewImage == undefined} onSearchTextChange={setSearchText} searchText={searchText}>
      <List.EmptyView
        icon={previewImage}
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
