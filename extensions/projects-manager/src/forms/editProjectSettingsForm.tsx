import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import ProjectSettings from "../types/projectSettings";
import { LocalStorage } from "@raycast/api";

export default function EditProjectSettingsForm(props: { projectSettings: ProjectSettings }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            onSubmit={async () => {
              const allProjectSettings = JSON.parse(
                (await LocalStorage.getItem<string>("projectSettings")) || "[]",
              ) as ProjectSettings[];
              const projectSetting = allProjectSettings.find((p) => p.projectID === props.projectSettings.projectID);
              if (projectSetting) {
                projectSetting.initialVersion = props.projectSettings.initialVersion;
              }
              await LocalStorage.setItem("projectSettings", JSON.stringify(allProjectSettings));
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="initialVersion"
        title="Set Initial Version"
        defaultValue={props.projectSettings.initialVersion}
        onChange={(value) => {
          props.projectSettings.initialVersion = value;
        }}
      />
    </Form>
  );
}
