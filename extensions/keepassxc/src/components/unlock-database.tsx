import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { KeePassLoader, showToastCliErrors } from "../utils/keepass-loader";

interface PasswordForm {
  password: string;
  keyFile: string[];
}

/**
 * Component for unlocking the KeePass database.
 *
 * This component renders a form that requires a password and an optional key file
 * to unlock the KeePass database. Upon submission, it validates the credentials,
 * stores them securely, and updates the lock status of the database.
 *
 * @param {Object} props - The component props.
 * @param {(isUnlocked: boolean) => void} props.setIsUnlocked - A function to update the lock status of the database.
 *
 * @returns {JSX.Element} The form interface for unlocking the KeePass database.
 */
export default function UnlockDatabase({ setIsUnlocked }: { setIsUnlocked: (isUnlocked: boolean) => void }) {
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
      }, showToastCliErrors);
    },
    validation: {
      password: (value) => {
        if (!value) {
          return "Required";
        }
      },
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
      <Form.Description
        text={"ⓘ Your password and key file path will be stored in your Raycast's local encrypted storage."}
      />
    </Form>
  );
}
