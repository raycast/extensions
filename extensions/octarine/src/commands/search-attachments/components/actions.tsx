import { Action, ActionPanel, Icon, Keyboard, openCommandPreferences, openExtensionPreferences } from "@raycast/api";
import type { Image } from "@raycast/api";
import { openAttachment } from "@lib/octarine";
import type { IndexedAttachment } from "@type/attachments";

export type AttachmentViewAction = {
  title: string;
  icon: Image.ImageLike;
  onAction: () => void;
};

type AttachmentActionsProps = {
  file?: IndexedAttachment;
  onRefresh: () => void;
  viewAction: AttachmentViewAction;
};

type EmptyAttachmentsActionsProps = Pick<AttachmentActionsProps, "onRefresh" | "viewAction">;

export function AttachmentActions({ file, onRefresh, viewAction }: AttachmentActionsProps) {
  return (
    <ActionPanel>
      {file && (
        <>
          <Action.Open title="Open File" target={file.path} />
          <Action
            title="Search in Octarine"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => void openAttachment(file.name, file.workspace.name)}
          />
          <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
          <Action.ShowInFinder title="Reveal in Finder" path={file.path} />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={file.path}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        </>
      )}
      <Action title={viewAction.title} icon={viewAction.icon} onAction={viewAction.onAction} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Search Attachments Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
    </ActionPanel>
  );
}

export function EmptyAttachmentsActions({ onRefresh, viewAction }: EmptyAttachmentsActionsProps) {
  return (
    <ActionPanel>
      <Action title={viewAction.title} icon={viewAction.icon} onAction={viewAction.onAction} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Search Attachments Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}
