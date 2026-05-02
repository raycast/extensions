import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import type { ReactNode } from "react";
import type { Item } from "$lib/types";
import { DestinationSubmenu } from "./destination-submenu";

export interface SharedActionPanelProps {
  path: string;
  sourceType?: Item["type"];
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  symlinkAction?: ReactNode;
  editAction?: ReactNode;
  onCreateFolder?: (name: string) => Promise<void>;
  onMoveItem?: (destinationPath: string) => Promise<void>;
  onCopyItem?: (destinationPath: string) => Promise<void>;
  onTrashItems?: (paths: string[]) => void;
  siblingDirectories?: Item[];
  revalidate?: () => void;
}

export const SharedActionPanel = ({
  path,
  sourceType = "file",
  primaryAction,
  secondaryAction,
  symlinkAction,
  editAction,
  onCreateFolder,
  onMoveItem,
  onCopyItem,
  onTrashItems,
  siblingDirectories,
  revalidate,
}: SharedActionPanelProps) => {
  function handleTrash(trashedPaths: Parameters<NonNullable<Action.Trash.Props["onTrash"]>>[0]) {
    const paths = Array.isArray(trashedPaths) ? trashedPaths : [trashedPaths];
    onTrashItems?.(paths.map(String));
    revalidate?.();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primaryAction}
        {secondaryAction}
        {symlinkAction}
        <Action.OpenWith path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd", "alt"], key: "r" }} />
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Item" content={{ file: path }} icon={Icon.Clipboard} />
        <Action.CopyToClipboard title="Copy Path" content={path} icon={Icon.Clipboard} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {editAction}
        {onCopyItem && (
          <DestinationSubmenu
            mode="copy"
            title="Copy to…"
            sourcePath={path}
            sourceType={sourceType}
            siblingDirectories={siblingDirectories ?? []}
            onSelect={onCopyItem}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
        {onMoveItem && (
          <DestinationSubmenu
            mode="move"
            title="Move to…"
            sourcePath={path}
            sourceType={sourceType}
            siblingDirectories={siblingDirectories ?? []}
            onSelect={onMoveItem}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        )}
        <Action.Trash paths={path} shortcut={{ modifiers: ["ctrl"], key: "x" }} onTrash={handleTrash} />
      </ActionPanel.Section>
      {onCreateFolder && (
        <ActionPanel.Section>
          <Action.Push
            title="New Folder"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            onPop={() => revalidate?.()}
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm
                      title="Create"
                      onSubmit={async (values: { name: string }) => {
                        const name = (values.name ?? "").trim();
                        if (name) {
                          await onCreateFolder(name);
                        }
                      }}
                    />
                  </ActionPanel>
                }
              >
                <Form.TextField id="name" title="Folder Name" placeholder="Enter folder name" />
              </Form>
            }
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
};
