import { Action, ActionPanel, Image, LaunchProps, List, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { downloadLatex, getPreviewImage, PreviewAbortSignal } from "./api";
import { ExportType, QuickLatexArguments, makeDonwloadDir, toClipboard } from "./utils";

export default function CommandWithCustoEmptyView(props: LaunchProps<{ arguments: QuickLatexArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.latex ?? "");
  const [previewImage, setPreviewImage] = useState<Image.ImageLike>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    makeDonwloadDir();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const abortController = new AbortController();
    setIsLoading(true);

    const timeout = setTimeout(() => {
      getPreviewImage(searchText, abortController.signal as PreviewAbortSignal)
        .then((image) => {
          if (isCurrent) {
            setPreviewImage(image);
            setIsLoading(false);
          }
        })
        .catch((error: unknown) => {
          if (isCurrent && !(error instanceof Error && error.name === "AbortError")) {
            setPreviewImage(undefined);
            setIsLoading(false);
          }
        });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [searchText]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchText={searchText}>
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
