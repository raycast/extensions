import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { EpicData } from "../types";

interface Props {
  epicData: EpicData;
  updateEpic: (data: EpicData) => boolean;
}

export const EditEpic: React.FC<Props> = ({ epicData, updateEpic }) => {
  const [name, setName] = useState(epicData.name);
  const [description, setDescription] = useState(epicData.description);

  const navigation = useNavigation();

  const handleSubmit = () => {
    const isSuccess = updateEpic({
      ...epicData,
      name,
      description,
    });
    if (isSuccess) {
      navigation.pop();
    }
  };

  return (
    <Form
      navigationTitle={`Edit epic "${epicData.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Epic" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        error={!name ? "Epic name cannot be empty" : undefined}
        onChange={setName}
      />
      <Form.TextField id="description" title="Description" value={description} onChange={setDescription} />
    </Form>
  );
};
