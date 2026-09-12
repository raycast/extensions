import {
  ActionPanel,
  Form,
  Action,
  LocalStorage,
  useNavigation,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";

type WorkspacePreferenceProps = {
  workspace: string;
  revalidate?: () => void;
};

interface Preferences {
  preferredEditor: string;
}

async function getDefaultValue(repository: string) {
  let defaultPrefValue: Preferences = getPreferenceValues<Preferences>();

  const item = await LocalStorage.getItem<string>(`${repository}`);
  const contextPref = item ? await JSON.parse(item) : null;
  if (contextPref && contextPref.preferredEditor && contextPref.preferredEditorClass) {
    defaultPrefValue = contextPref;
  }
  return defaultPrefValue;
}

export default function WorkspacePreference({ workspace }: WorkspacePreferenceProps) {
  const [defaultPrefValue, setDefaultPrefValue] = useState<Preferences | null>(null);

  const { pop } = useNavigation();

  useEffect(() => {
    const loadDefaultValues = async () => {
      const res = await getDefaultValue(workspace);
      setDefaultPrefValue(res);
    };

    loadDefaultValues();
  }, []);

  return (
    defaultPrefValue && (
      <Form
        navigationTitle={`${workspace}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Workspace Preferences"
              onSubmit={async (values: Preferences) => {
                try {
                  await LocalStorage.setItem(`${workspace}`, JSON.stringify(values));
                  await showToast({
                    title: "Preferences saved successfully",
                    style: Toast.Style.Success,
                  });
                  pop();
                } catch (error) {
                  await showToast({
                    title: "Error saving preferences",
                    style: Toast.Style.Failure,
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown
          id="preferredEditor"
          title="Preferred Editor"
          defaultValue={defaultPrefValue.preferredEditor}
          info={`Pick your favorite Editor`}
        >
          <Form.Dropdown.Item value="code" title="VS Code Browser" />
          <Form.Dropdown.Item value="code-desktop" title="VS Code Desktop" />
          <Form.Dropdown.Item value="ssh" title="SSH" />
        </Form.Dropdown>
      </Form>
    )
  );
}
