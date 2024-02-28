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

type RepositoryPreferenceProps = {
  repository: string;
  revalidate: () => void;
};

export interface Preferences {
  preferredEditor: string;
  useLatest: boolean;
  preferredEditorClass: "g1-standard" | "g1-large";
}

export async function getDefaultValue(repository: string) {
  let defaultPrefValue: Preferences = getPreferenceValues<Preferences>();

  const item = await LocalStorage.getItem<string>(`${repository}`);
  const contextPref = item ? await JSON.parse(item) : null;
  if (contextPref && contextPref.preferredEditor && contextPref.preferredEditorClass) {
    defaultPrefValue = contextPref;
  }
  return defaultPrefValue;
}

export default function RepositoryPreference({ repository, revalidate }: RepositoryPreferenceProps) {
  const [defaultPrefValue, setDefaultPrefValue] = useState<Preferences | null>(null);

  const { pop } = useNavigation();

  useEffect(() => {
    const loadDefaultValues = async () => {
      const res = await getDefaultValue(repository);
      setDefaultPrefValue(res);
    };

    loadDefaultValues();
  }, []);

  return (
    defaultPrefValue && (
      <Form
        navigationTitle={`${repository}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Repository Preferences"
              onSubmit={async (values: Preferences) => {
                try {
                  await LocalStorage.setItem(`${repository}`, JSON.stringify(values));
                  await showToast({
                    title: "Preferences saved successfully",
                    style: Toast.Style.Success,
                  });
                  revalidate();
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
          info={`Pick your favorite Editor for ${repository}`}
        >
          <Form.Dropdown.Item value="code" title="VS Code Browser" />
          <Form.Dropdown.Item value="code-desktop" title="VS Code Desktop" />
        </Form.Dropdown>
        <Form.Checkbox
          id="useLatest"
          info="Use the latest version for each editor. Insiders for VS Code, EAP for JetBrains IDEs."
          label="Latest Release (Unstable)"
          defaultValue={defaultPrefValue.useLatest}
        />
        <Form.Dropdown
          id="preferredEditorClass"
          title="Workspace Class"
          info="Up to 4 cores, 8GB RAM, 30GB storage in Standard & Up to 8 cores, 16GB RAM, 50GB storage in Large"
          defaultValue={defaultPrefValue.preferredEditorClass}
        >
          <Form.Dropdown.Item value="g1-standard" title="Standard" />
          <Form.Dropdown.Item value="g1-large" title="Large" />
        </Form.Dropdown>
      </Form>
    )
  );
}
