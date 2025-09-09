import { XcodeCodeSnippet } from "../../models/xcode-code-snippet/xcode-code-snippet.model";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { XcodeCodeSnippetListItemDetail } from "./xcode-code-snippet-list-item-detail.component";
import { XcodeCodeSnippetService } from "../../services/xcode-code-snippet.service";
import { XcodeCodeSnippetForm } from "./xcode-code-snippet-form.component";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Code Snippet List Item
 */
export function XcodeCodeSnippetListItem(props: {
  codeSnippet: XcodeCodeSnippet;
  onSave: () => void;
  onDelete: () => void;
}) {
  const codeSnippetFilePath = XcodeCodeSnippetService.codeSnippetFilePath(props.codeSnippet);
  return (
    <List.Item
      title={props.codeSnippet.IDECodeSnippetTitle}
      detail={<XcodeCodeSnippetListItemDetail codeSnippet={props.codeSnippet} />}
      actions={
        <ActionPanel>
          <Action.Paste content={props.codeSnippet.IDECodeSnippetContents} />
          <Action.Push
            icon={Icon.Pencil}
            title="Edit"
            target={<XcodeCodeSnippetForm codeSnippet={props.codeSnippet} onSubmit={props.onSave} />}
          />
          <Action.Open
            icon={Icon.Hammer}
            title="Open with Xcode"
            target={codeSnippetFilePath}
            application={XcodeService.bundleIdentifier}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.ShowInFinder path={codeSnippetFilePath} shortcut={Keyboard.Shortcut.Common.OpenWith} />
          <Action.Trash
            title="Delete"
            paths={codeSnippetFilePath}
            onTrash={props.onDelete}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel>
      }
    />
  );
}
