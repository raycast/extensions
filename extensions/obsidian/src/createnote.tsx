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
  AlertOptions,
  confirmAlert,
  Icon,
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
  prefTag: string;
  tags: string;
  primaryAction: string;
}

interface FormValue {
  path: string;
  name: string;
  content: string;
  tags: Array<string>;
}

function prefVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .map((vault) => ({ name: vault.trim(), key: vault.trim() }))
    .filter((vault) => !!vault);
}

function prefPath(): string {
  const pref: Preferences = getPreferenceValues();
  const prefPath = pref.prefPath;
  if (prefPath) {
    return prefPath;
  }
  return "";
}

function prefTag(): Array<string> {
  const pref: Preferences = getPreferenceValues();
  const prefTag = pref.prefTag;
  if (prefTag) {
    return [prefTag];
  }
  return [];
}

function tags() {
  const pref: Preferences = getPreferenceValues();
  const tagsString = pref.tags;
  const prefTag = pref.prefTag;
  if (!tagsString) {
    return [{ name: prefTag, key: prefTag }];
  }
  const tags = tagsString
    .split(",")
    .map((tag) => ({ name: tag.trim(), key: tag.trim() }))
    .filter((tag) => !!tag);
  tags.push({ name: prefTag, key: prefTag });
  return tags;
}

function NoteForm(props: { vaultPath: string }) {
  const vaultPath = props.vaultPath;
  const { pop } = useNavigation();

  async function writeNote(notePath: string, name: string, content: string) {
    if (fs.existsSync(path.join(notePath, name + ".md"))) {
      const options: AlertOptions = {
        title: "Override note",
        message: 'Are you sure you want to override the note: "' + name + '"?',
        icon: Icon.ExclamationMark,
      };
      if (await !confirmAlert(options)) {
        return;
      }
    }

    try {
      fs.mkdirSync(notePath, { recursive: true });
      fs.writeFileSync(path.join(notePath, name + ".md"), content);
      showToast(ToastStyle.Success, "Created new note");
      pop();
    } catch {
      showToast(ToastStyle.Failure, "Something went wrong. Maybe your vault, path or filename is not valid.");
    }
  }

  function createNewNote(noteProps: FormValue) {
    if (noteProps.name == "") {
      showToast(ToastStyle.Failure, "Please enter a name");
    } else {
      let content = "";
      if (noteProps.tags.length > 0) {
        content = "---\ntags: [";
        for (let i = 0; i < noteProps.tags.length - 1; i++) {
          content += '"' + noteProps.tags[i] + '",';
        }
        content += '"' + noteProps.tags.pop() + '"]\n---\n';
      }
      content += noteProps.content;
      writeNote(path.join(vaultPath, noteProps.path), noteProps.name, content);
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
      <Form.TagPicker id="tags" title="Tags" defaultValue={prefTag()}>
        {tags()?.map((tag) => (
          <Form.TagPicker.Item value={tag.name.toLowerCase()} title={tag.name} key={tag.key} />
        ))}
      </Form.TagPicker>
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
              <PushAction title="Select Vault" target={<NoteForm vaultPath={vault.name} />} />
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
