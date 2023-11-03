import type { RecordData, RevalidateRecords } from "../types";
import type { ValidationErrors } from "../utils";
import { useState } from "react";
import { Form, Action, ActionPanel, useNavigation, Icon, showToast, Toast } from "@raycast/api";
import { documentStore } from "../context";
import { records, validation } from "../utils";
import { GeneratePasswordAction } from "../actions";

interface Props {
  id: string;
  initialValues: RecordData;
  revalidateRecords: RevalidateRecords;
}

export const EditRecordForm: React.FC<Props> = ({ id, initialValues, revalidateRecords }) => {
  const { pop } = useNavigation();
  const { ref, password } = documentStore.getState();
  const [errors, setErrors] = useState<ValidationErrors<RecordData>>({
    name: undefined,
    email: undefined,
    password: undefined,
    secret: undefined,
    username: undefined,
    url: undefined,
    notes: undefined,
  });

  const handleValidation = (name: string, value: string | undefined) => {
    const { error } = validation.validate.field({
      schema: validation.schemas.newRecord,
      field: name,
      value: { [name]: value },
    });

    if (error) return setErrors((prev) => ({ ...prev, [name]: error }));
    return setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (record: RecordData) => {
    const empty = validation.validate.empty<RecordData>(record, ["name", "password"]);
    if (empty) {
      await showToast(Toast.Style.Failure, "Required fields cannot be empty");
      return;
    }
    try {
      await records.edit({ id, record, password: ref?.isEncrypted ? password : undefined });
      await revalidateRecords();
      await showToast(Toast.Style.Success, "Record updated");
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to edit record", "Reload and refresh cache if the problem persists");
    }
  };

  return (
    <Form
      navigationTitle={`Edit Record ${id}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.ArrowRightCircle} />
          <GeneratePasswordAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Service Name"
        placeholder="Gmail"
        defaultValue={initialValues.name}
        error={errors.name}
        onChange={(newValue) => handleValidation("name", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
      <Form.TextField
        id="username"
        title="Username"
        placeholder="Rad Username..."
        defaultValue={initialValues?.username}
        error={errors.username}
        onChange={(newValue) => handleValidation("username", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="you@gmail.com"
        defaultValue={initialValues?.email}
        error={errors.email}
        onChange={(newValue) => handleValidation("email", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        info="You can generate a password with the action panel (⌘P)"
        placeholder="My secret password!"
        defaultValue={initialValues.password}
        error={errors.password}
        onChange={(newValue) => handleValidation("password", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
      <Form.PasswordField
        id="secret"
        title="Secret"
        info="Add an optional secret to generate TOTP codes"
        placeholder="My TOTP secret!"
        defaultValue={initialValues.secret}
        error={errors.secret}
        onChange={(newValue) => handleValidation("secret", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
      <Form.TextField
        id="url"
        info="Add a url to quickly access the website and pull the favicon for quick visual reference"
        title="Service URL"
        placeholder="https://gmail.com/"
        defaultValue={initialValues?.url}
        error={errors.url}
        onChange={(newValue) => handleValidation("url", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Any additional information about the record or how to use it"
        defaultValue={initialValues?.notes}
        error={errors.notes}
        onChange={(newValue) => handleValidation("notes", newValue)}
        onBlur={(e) => handleValidation(e.target.id, e.target.value)}
      />
    </Form>
  );
};
