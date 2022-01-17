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
  path: string;
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

function getVaultNameFromPath(vaultPath: string): string {
  const name = vaultPath
    .split(path.sep)
    .filter((i) => {
      if (i != "") {
        return i;
      }
    })
    .pop();
  if (name) {
    return name;
  } else {
    return "Default Vault Name (check your path preferences)";
  }
}

function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }))
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
      if (await confirmAlert(options)) {
        saveMDFile(notePath, name, content);
      }
    } else {
      saveMDFile(notePath, name, content);
    }
  }

  function saveMDFile(notePath: string, name: string, content: string) {
    try {
      fs.mkdirSync(notePath, { recursive: true });
      fs.writeFileSync(path.join(notePath, name + ".md"), content);
      showToast(ToastStyle.Success, "Created new note");
      pop();
    } catch {
      showToast(ToastStyle.Failure, "Something went wrong. Maybe your vault, path or filename is not valid.");
    }
  }

  function buildNoteContent(tags: Array<string>, noteContent: string) {
    let content = "";
    if (tags.length > 0) {
      content = "---\ntags: [";
      for (let i = 0; i < tags.length - 1; i++) {
        content += '"' + tags[i] + '",';
      }
      content += '"' + tags.pop() + '"]\n---\n';
    }
    content += noteContent;
    return content;
  }

  function createNewNote(noteProps: FormValue) {
    if (noteProps.name == "") {
      showToast(ToastStyle.Failure, "Please enter a name");
    } else {
      const content = buildNoteContent(noteProps.tags, noteProps.content);
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
      <Form.TextField title="Path" id="path" defaultValue={prefPath()} placeholder="path/to/note (optional)" />
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
              <PushAction title="Select Vault" target={<NoteForm vaultPath={vault.path} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const vaults = parseVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} />;
  } else if (vaults.length == 1) {
    return <NoteForm vaultPath={vaults[0].path} />;
  } else {
    showToast(ToastStyle.Failure, "Path Error", "Something went wrong with your vault path.");
  }
}
