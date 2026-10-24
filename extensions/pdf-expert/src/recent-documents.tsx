import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { NotInstalledList, useLoadOnMount } from "./lib/not-installed-view";
import { CopyFileAction, RevealInFinderAction } from "./lib/pdf-file-actions";
import {
  getRecentDocuments,
  isInstalled,
  PdfFile,
  switchToTab,
} from "./lib/pdf-expert";
import { shortenPath } from "./lib/utils";

export default function RecentDocuments() {
  const [docs, setDocs] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!isInstalled()) {
      setIsLoading(false);
      return;
    }
    try {
      setDocs(getRecentDocuments());
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could Not Read Recent Documents",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useLoadOnMount(load);

  if (!isLoading && !isInstalled()) {
    return <NotInstalledList />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent documents…">
      {docs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Recent Documents"
          description="Open a PDF in PDF Expert and it will appear here"
          icon={Icon.Document}
        />
      ) : (
        docs.map((doc) => (
          <List.Item
            key={doc.path}
            title={doc.name}
            subtitle={shortenPath(doc.folder)}
            keywords={doc.name.split(/[_\-\s]+/).flatMap((w) => {
              const parts = w.split(/(?<=[a-z])(?=[A-Z])/);
              return parts.length > 1 ? [w, ...parts] : [w];
            })}
            icon={
              doc.exists
                ? Icon.Document
                : { source: Icon.Document, tintColor: Color.SecondaryText }
            }
            accessories={
              doc.exists
                ? []
                : [{ text: { value: "Not Found", color: Color.SecondaryText } }]
            }
            actions={
              <ActionPanel>
                {doc.exists ? (
                  <>
                    <Action
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title="Open in PDF Expert"
                      icon={Icon.ArrowRight}
                      onAction={async () => {
                        try {
                          switchToTab(doc.path);
                          await closeMainWindow();
                          await popToRoot();
                        } catch (err) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Could Not Open File",
                            message:
                              err instanceof Error ? err.message : String(err),
                          });
                        }
                      }}
                    />
                    <RevealInFinderAction path={doc.path} />
                    <CopyFileAction path={doc.path} />
                  </>
                ) : null}
                <Action
                  title="Copy File Path"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={async () => {
                    await Clipboard.copy(doc.path);
                    await showHUD("Path copied");
                  }}
                />
                <Action
                  title="Copy File Name"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(doc.fullName);
                    await showHUD("Name copied");
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
