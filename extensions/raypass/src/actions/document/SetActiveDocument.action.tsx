import { Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { documentStore } from "../../context";
import { docs } from "../../utils";
import { Records, EncryptedPasswordForm } from "../../views";

interface Props {
  doc: { name: string; isActive: boolean };
}

export const SetActiveDocument: React.FC<Props> = ({ doc }) => {
  const { push } = useNavigation();

  const handleSetActiveDocument = async () => {
    try {
      await docs.set({ documentName: doc.name });
      const { ref, password } = documentStore.getState();
      const encryptedWithNoPassword = ref && ref.isEncrypted && !password;
      if (encryptedWithNoPassword) return push(<EncryptedPasswordForm documentName={doc.name} />);

      return push(<Records />);
    } catch (err) {
      await showToast(Toast.Style.Failure, "Failed to set active document", `${err}`);
      return;
    }
  };

  return <Action icon={Icon.Switch} title="Select Document" onAction={handleSetActiveDocument} />;
};
