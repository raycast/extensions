import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import type { SavedLocation } from "./storage";

interface RenameFavoriteFormProps {
  location: SavedLocation;
  onSubmit: (id: string, nickname: string) => Promise<void>;
}

export function RenameFavoriteForm({ location, onSubmit }: RenameFavoriteFormProps) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Rename Favorite"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { nickname: string }) => {
              await onSubmit(location.id, values.nickname);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={location.label} />
      <Form.TextField
        id="nickname"
        title="Name"
        placeholder="e.g. Home, Work, Cabin"
        defaultValue={location.nickname ?? ""}
        info="Leave empty to clear the custom name and show the address instead."
      />
    </Form>
  );
}
