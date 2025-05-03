import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { NewEpicData } from "../types";

interface Props {
  addEpic: (data: NewEpicData) => boolean;
}

interface Values {
  name: string;
  description: string;
}

export const AddEpic: React.FC<Props> = ({ addEpic }) => {
  const [nameError, setNameError] = useState("");

  const navigation = useNavigation();

  const handleSubmit = (values: Values) => {
    const { name, description } = values;
    const isSuccess = addEpic({
      name,
      description,
    });
    if (isSuccess) {
      navigation.pop();
    }
  };

  return (
    <Form
      navigationTitle="Create New Epic"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Epic" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="ABC-1"
        error={nameError}
        onBlur={(e) => {
          const value = e.target.value;
          setNameError("");
          if (!value) {
            setNameError("Epic name cannot be empty");
          }
        }}
        onChange={() => {
          if (nameError) setNameError("");
        }}
      />
      <Form.TextArea id="description" title="Placeholder" />
    </Form>
  );
};
