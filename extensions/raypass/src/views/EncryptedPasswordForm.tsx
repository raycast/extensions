import type { ValidationErrors } from "../utils";
import { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, Icon, showToast, Toast } from "@raycast/api";
import { documentStore } from "../context";
import { docs, validation } from "../utils";
import { ManageDocumentsAction, RefreshLocalReferencesActions, ExitRayPassAction } from "../actions";
import { Records } from "./Records";

interface Props {
  documentName: string;
}

interface EncryptedPasswordData {
  password: string;
}

export const EncryptedPasswordForm: React.FC<Props> = ({ documentName }) => {
  const { push } = useNavigation();

  const [errors, setErrors] = useState<ValidationErrors<EncryptedPasswordData>>({
    password: undefined,
  });

  const handleValidation = (name: string, value: string | undefined) => {
    const { error } = validation.validate.field({
      schema: validation.schemas.encryptedPassword,
      field: name,
      value: { [name]: value },
    });

    if (error) return setErrors((prev) => ({ ...prev, [name]: error }));
    return setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async ({ password }: EncryptedPasswordData) => {
    const empty = validation.validate.empty<EncryptedPasswordData>({ password }, ["password"]);
    if (empty) return;

    try {
      await docs.get({ documentName, password });
      documentStore.setState({ password: password });
      await showToast(Toast.Style.Success, "Correct password", "You can now access your records");
      push(<Records />);
    } catch (error) {
      // other errors are not handled...
      return setErrors((prev) => ({ ...prev, password: "Incorrect password" }));
    }
  };

  return (
    <Form
      navigationTitle="Encrypted Document Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decrypt Document" onSubmit={handleSubmit} icon={Icon.LockUnlocked} />
          <ManageDocumentsAction />
          <RefreshLocalReferencesActions />
          <ExitRayPassAction />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Encrypted Document"
        text={`The document "${documentName}" is encrypted, enter the corresponding password to access it.`}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="My secret password"
        autoFocus
        error={errors.password}
        onChange={(newValue) => handleValidation("password", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
    </Form>
  );
};
