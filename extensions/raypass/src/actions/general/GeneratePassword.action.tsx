import { nanoid } from "nanoid";
import { Action, Icon, showToast, Toast } from "@raycast/api";
import { misc } from "../../utils";

export const GeneratePasswordAction: React.FC = () => (
  <Action
    icon={Icon.Clipboard}
    shortcut={{ modifiers: ["cmd"], key: "g" }}
    title="Generate Password"
    onAction={async () => {
      const password = nanoid();
      misc.copy(password);
      await showToast(Toast.Style.Success, `${password} copied to clipboard!`, "Store it in a safe place!");
    }}
  />
);
