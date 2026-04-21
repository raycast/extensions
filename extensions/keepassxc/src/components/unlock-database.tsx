import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { JSX } from "react/jsx-runtime";
import { useForm } from "@raycast/utils";

import { KeePassLoader, showToastKeepassxcCliErrors } from "../utils/keepass-loader";

interface PasswordForm {
  password: string;
  keyFile: string[];
}

/**
 * Component for unlocking the KeePass database
 *
 * This component renders a form that allows a user to input a password and a key file
 * to unlock a KeePass database. Upon submission, it validates the credentials,
 * stores them securely, and updates the lock status of the database
 *
 * @param {Object} props - The component props
 * @param {(isUnlocked: boolean) => void} props.setIsUnlocked - A function to update the lock status of the database
 * @returns {JSX.Element} - The form interface for unlocking the KeePass database
 */
export default function UnlockDatabase({
  setIsUnlocked,
}: {
  setIsUnlocked: (isUnlocked: boolean) => void;
}): JSX.Element {
  const { handleSubmit, itemProps } = useForm<PasswordForm>({
    onSubmit(value) {
      showToast({
        style: Toast.Style.Animated,
        title: "Unlocking Database...",
      });
      KeePassLoader.checkCredentials(value.password, value.keyFile[0]).then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "Database Unlocked",
        });
        KeePassLoader.cacheCredentials(value.password, value.keyFile[0]);
        KeePassLoader.setCredentials(value.password, value.keyFile[0]);
        setIsUnlocked(true);
      }, showToastKeepassxcCliErrors);
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Unlock" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={"Your KeePass database is currently locked. Insert your credentials to unlock it."} />
      <Form.PasswordField title="Database Password" {...itemProps.password} />
      <Form.FilePicker id="keyFile" title="Key File" allowMultipleSelection={false} />
      <Form.Description text={"ⓘ Credentials will be stored in Raycast's local encrypted storage."} />
    </Form>
  );
}
