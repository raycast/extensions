import type { ValidationErrors } from "../utils";
import type { NewDocumentData, RevalidateDocuments } from "../types";
import { useState } from "react";
import { Form, Action, ActionPanel, useNavigation, Icon, Toast, environment, showToast } from "@raycast/api";
import { docs, validation } from "../utils";
import {
  GeneratePasswordAction,
  ManageDocumentsAction,
  RefreshLocalReferencesActions,
  ExitRayPassAction,
} from "../actions";

interface Props {
  revalidateDocuments: RevalidateDocuments;
}

export const NewDocumentForm: React.FC<Props> = ({ revalidateDocuments }) => {
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<ValidationErrors<NewDocumentData>>({
    name: undefined,
    encrypted: undefined,
    password: undefined,
  });
  const [encrypting, setEncrypting] = useState<boolean>(false);

  const handleValidation = (name: string, value: string | undefined) => {
    const { error } = validation.validate.field({
      schema: validation.schemas.newDocument,
      field: name,
      value: { [name]: value },
    });

    if (error) return setErrors((prev) => ({ ...prev, [name]: error }));
    return setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (document: NewDocumentData) => {
    const empty = validation.validate.empty<NewDocumentData>(document, ["name", "password"]);
    if (empty) return;

    try {
      const nameExists = await docs.collision({
        name: document.name,
        isEncrypted: encrypting,
      });
      if (nameExists) return setErrors((prev) => ({ ...prev, name: "A document with this name already exists!" }));
      await docs.new(document);
      await showToast(Toast.Style.Success, "Document created");
      await revalidateDocuments();
      pop();
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Failed to create new document",
        "Reload and refresh cache if the problem persists"
      );
      return;
    }
  };

  return (
    <Form
      navigationTitle="New Document"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="New Document">
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.ArrowRightCircle} />
            <GeneratePasswordAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="RayPass Actions">
            <ManageDocumentsAction />
            <RefreshLocalReferencesActions />
            <ExitRayPassAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="New Document"
        text={`Create a new document to locally store your passwords. Files are stored in ${environment.supportPath}/data. You can encrypt your document with a password (will be required when accessing doc). If you choose not to encrypt your document, it will be stored in plain text.`}
      />
      <Form.TextField
        id="name"
        title="Document Name"
        placeholder="Enter a name for your document"
        error={errors.name}
        onChange={(newValue) => handleValidation("name", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />

      <Form.Checkbox
        id="encrypt"
        label="Encrypt and require password?"
        error={errors.encrypted}
        value={encrypting}
        onChange={setEncrypting}
        title="Encrypt Document"
      />

      {encrypting && (
        <Form.PasswordField
          id="password"
          title="Password"
          info="You can generate a password with the action panel (⌘P)"
          placeholder="My secret password"
          error={errors.password}
          onChange={(newValue) => handleValidation("password", newValue)}
          onBlur={(e) => handleValidation(e.target.id, e.target.value)}
        />
      )}
    </Form>
  );
};
