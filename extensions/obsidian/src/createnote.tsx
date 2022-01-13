import {
  List,
  ActionPanel,
  getPreferenceValues,
  PushAction,
  Form,
  SubmitFormAction,
  useNavigation,
  showToast,
  ToastStyle,
} from "@raycast/api";
import fs from "fs";
import path from "path";


interface Vault {
  name: string;
  key: string;
}

interface Preferences {
  vaultPath: string;
  prefPath: string;
  primaryAction: string;
}


interface FormValue {
  path: string;
  name: string;
  content: string;
}


function prefVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString.split(",").map(vault => ({ name: vault.trim(), key: vault.trim() })).filter(vault => !!vault);
}

function prefPath(): string {
  const pref: Preferences = getPreferenceValues();
  const prefPath = pref.prefPath;
  if (prefPath) {
    return prefPath;
  }
  return "";
}


function NoteForm(props: { vaultPath: string }) {
  const vaultPath = props.vaultPath;
  const { pop } = useNavigation();

  function createNewNote(noteProps: FormValue) {
    if (noteProps.name == "") {
      showToast(ToastStyle.Failure, "Please enter a name");
    } else {
      try {
        fs.writeFileSync(path.join(vaultPath, noteProps.path, noteProps.name + ".md"), noteProps.content);
        showToast(ToastStyle.Success, "Created new note");
        pop();
      }
      catch {
        showToast(ToastStyle.Failure, "Something went wrong. Maybe your path doesnt exist.");
      }
    }
  }

  return (
    <Form
      navigationTitle={"Create new Note"}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create" onSubmit={createNewNote} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" id="name" placeholder="Name of note" />
      <Form.TextField title="Path" id="path" defaultValue={prefPath()} placeholder="path/to/note" />
      <Form.TextArea title="Content:" id="content" placeholder={"Text"} />
    </Form>
  );
}


function VaultSelection(props: { vaults: Vault[] }) {
  const vaults = props.vaults;
  return (
    <List>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <PushAction
                title="Select Vault"
                target={<NoteForm vaultPath={vault.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}


export default function Command() {
  const vaults = prefVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} />;
  } else if (vaults.length == 1) {
    return <NoteForm vaultPath={vaults[0].name} />;
  } else {
    showToast(ToastStyle.Failure, "Path Error", "Something went wrong with your vault path.");
  }
}
