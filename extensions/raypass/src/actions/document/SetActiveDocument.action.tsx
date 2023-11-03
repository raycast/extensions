import { Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { docs } from "../../utils";
import { Records } from "../../views";

interface Props {
  doc: { name: string; isActive: boolean };
}

export const SetActiveDocument: React.FC<Props> = ({ doc }) => {
  const { push } = useNavigation();
  // reval

  const handleSetActiveDocument = async () => {
    // pop for active?
    try {
      await docs.set({ documentName: doc.name });
      return push(<Records />);
    } catch (err) {
      await showToast(Toast.Style.Failure, "Failed to set active document", `${err}`);
      return;
    }
  };

  return (
    <Action
      icon={Icon.Switch}
      // shortcut={{ modifiers: ["cmd"], key: "enter" }}
      title="Select Document"
      onAction={handleSetActiveDocument}
    />
  );
};
