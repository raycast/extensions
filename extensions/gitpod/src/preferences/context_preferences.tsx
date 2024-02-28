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

type ContextPreferenceProps = {
  repository: string;
  type: "Branch" | "Pull Request" | "Issue";
  context: string;
  revalidate: () => void;
};

interface Preferences {
  preferredEditor: string;
  useLatest: boolean;
  preferredEditorClass: "g1-standard" | "g1-large";
}

async function getDefaultValue(repository: string, context: string) {
  let defaultPrefValue: Preferences = getPreferenceValues<Preferences>();
  const item = await LocalStorage.getItem<string>(`${repository}%${context}`);
  const contextPref = item ? await JSON.parse(item) : null;
  if (contextPref && contextPref.preferredEditor && contextPref.preferredEditorClass) {
    defaultPrefValue = contextPref;
  } else {
    const repoItem = await LocalStorage.getItem<string>(`${repository}`);
    const repoPref = repoItem ? await JSON.parse(repoItem) : null;
    if (repoPref && repoPref.preferredEditor && repoPref.preferredEditorClass) {
      defaultPrefValue = repoPref;
    }
  }

  return defaultPrefValue;
}

export default function ContextPreferences({ repository, type, context, revalidate }: ContextPreferenceProps) {
  const [defaultPrefValue, setDefaultPrefValue] = useState<Preferences | null>(null);

  useEffect(() => {
    const getUsers = async () => {
      const res = await getDefaultValue(repository, context);
      setDefaultPrefValue(res);
    };

    getUsers();
  }, []);

  const { pop } = useNavigation();

  return (
    defaultPrefValue && (
      <Form
        navigationTitle={`${type} - ${context}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Context Preferences"
              onSubmit={async (values: Preferences) => {
                try {
                  await LocalStorage.setItem(`${repository}%${context}`, JSON.stringify(values));
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
          info={`Pick your favorite Editor for ${repository}'s "${context}" ${type}`}
        >
          <Form.Dropdown.Item value="code" title="VS Code Browser" />
          <Form.Dropdown.Item value="code-desktop" title="VS Code Desktop" />
          <Form.Dropdown.Item value="intellij" title="IntelliJ" />
          <Form.Dropdown.Item value="goland" title="GoLand" />
          <Form.Dropdown.Item value="phpstorm" title="PhpStorm" />
          <Form.Dropdown.Item value="pycharm" title="PyCharm" />
          <Form.Dropdown.Item value="rubymine" title="RubyMine" />
          <Form.Dropdown.Item value="webstorm" title="WebStorm" />
          <Form.Dropdown.Item value="rider" title="Rider" />
          <Form.Dropdown.Item value="clion" title="CLion" />
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
