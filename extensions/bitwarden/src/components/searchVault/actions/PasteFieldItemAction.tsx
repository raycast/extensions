import { Clipboard, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";

type PasteFieldItemActionProps = {
  label: string;
  content: string | number | Clipboard.Content;
  shortcut?: Keyboard.Shortcut;
};

function PasteFieldItemAction({ label, content, shortcut }: PasteFieldItemActionProps) {
  const currentApplication = useFrontmostApplicationName();

  const tryPaste = async () => {
    try {
      await Clipboard.paste(content);
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to paste ${label}`);
      captureException(`Failed to paste field: ${label}`, error);
    }
  };

  return (
    <ActionWithReprompt
      title={currentApplication ? `Paste ${label} into ${currentApplication}` : `Paste ${label}`}
      icon={Icon.Window}
      onAction={tryPaste}
      shortcut={shortcut}
      repromptDescription={currentApplication ? `Pasting ${label} into ${currentApplication}` : `Pasting ${label}`}
    />
  );
}

export default PasteFieldItemAction;
