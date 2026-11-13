import { Action, Clipboard, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";

type CopyFieldItemActionProps = {
  label: string;
  content: string | number | Clipboard.Content;
  type?: "password" | "other";
  shortcut?: Keyboard.Shortcut;
};

function CopyFieldItemAction({ label, content, type, shortcut }: CopyFieldItemActionProps) {
  const tryCopy = async () => {
    try {
      const concealed = getTransientCopyPreference(type ?? "other");
      await Clipboard.copy(content, { concealed });
      await showCopySuccessMessage(`Copied ${label}`);
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to copy ${label}`);
      captureException(`Failed to copy field: ${label}`, error);
    }
  };

  return <Action title={`Copy ${label}`} icon={Icon.Clipboard} onAction={tryCopy} shortcut={shortcut} />;
}

export default CopyFieldItemAction;
