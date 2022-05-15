import { Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { nanoid } from "nanoid";
import { getCommandForCurrentSettings } from "../utils/getCommandForCurrentSettings";
import { useFavorites } from "../utils/use-favorites";

export function Favorite({ fav }: { fav?: Favorite }) {
  const { favorites, actions, isLoading } = useFavorites();
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${fav ? "Edit" : "New"} DisplayPlacer Preset`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={fav ? "Save Changes" : "Create Preset"}
            icon={fav ? Icon.Document : Icon.Plus}
            onSubmit={async (values: { name: string; subtitle: string; overwrite?: boolean }) => {
              const command = await getCommandForCurrentSettings();
              if (!command) return;

              const i = favorites.findIndex((f) => f.id === fav?.id);
              if (i >= 0) {
                actions.updateAt(i, {
                  ...favorites[i],
                  name: values.name,
                  subtitle: values.subtitle ?? "",
                  command: values.overwrite ? command : favorites[i].command,
                });
              } else {
                actions.push({
                  id: nanoid(),
                  name: values.name,
                  subtitle: values.subtitle ?? "",
                  command,
                });
              }

              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Preset Name" key="name" id="name" defaultValue={fav?.name} />
      <Form.TextField
        title="Subtitle"
        placeholder="Short description shown next to title"
        defaultValue={fav?.subtitle}
        key="subtitle"
        id="subtitle"
      />
      {fav !== undefined && (
        <Form.Checkbox label="Overwrite saved display settings with current display settings" id="overwrite" />
      )}
    </Form>
  );
}
