import {
  open,
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Clipboard,
  Toast,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import axios from "axios";
import CryptoJS from "crypto-js";

type Values = {
  title: string;
  content: string;
  expire_at?: Date;
  encrypted: boolean;
  password: string;
  folder: string;
  visibility: string;
};

// type PastefyFolder = { id: string; name: string; children: [] }
type FolderListEntry = { id: string; path: string };

export default function Command() {
  const { isLoading, data: folders } = usePromise(async () => {
    try {
      const res = await axios.get("https://pastefy.app/api/v2/user/folders?hide_pastes=true", {
        headers: {
          Authorization: `Bearer ${getPreferenceValues().apiKey}`,
        },
      });
      const folders: FolderListEntry[] = [];

      const addFolders = (folder: { id: string; name: string; children: [] }, prefix = "") => {
        const folderName = prefix + folder.name;
        folders.push({
          id: folder.id,
          path: folderName,
        });

        if (folder.children) {
          for (const subFolder of folder.children) {
            addFolders(subFolder, `${folderName}/`);
          }
        }
      };

      for (const folder of res.data) {
        addFolders(folder);
      }

      return folders;
    } catch {
      // This fails if not logged in. Ignore it because you can use pastefy without being logged in.
      return null;
    }
  });

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values: Values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Creating paste...`,
        message: "Waiting for creation of paste",
      });

      const paste = {
        title: values.title,
        content: values.content,
        encrypted: !!(values.password || values.encrypted),
        folder: values.folder || undefined,
        visibility: values.visibility,
        expire_at: values.expire_at?.toISOString()?.slice(0, 19)?.replace("T", " ") || undefined,
      };

      let currentPassword = "";

      if (paste.encrypted) {
        currentPassword =
          values.encrypted && !values.password
            ? Math.random().toString(36).substring(3) + Math.random().toString(36).substring(3)
            : values.password;

        paste.title = CryptoJS.AES.encrypt(paste.title, currentPassword).toString();
        paste.content = CryptoJS.AES.encrypt(paste.content, currentPassword).toString();
      }

      const res = await axios.post(`https://pastefy.app/api/v2/paste`, paste, {
        headers: {
          Authorization: `Bearer ${getPreferenceValues().apiKey}`,
        },
      });
      const pasteUrl = `https://pastefy.app/${res.data.paste.id}${currentPassword && !values.password ? "#" + currentPassword : ""}`;
      await Clipboard.copy({
        text: pasteUrl,
      });

      await closeMainWindow();
      await open(pasteUrl);

      toast.title = "Done!";
      toast.message = "Paste has been saved to clipboard";

      await popToRoot();
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Title.txt (.md for markdown)" />
      <Form.TextArea
        enableMarkdown={itemProps.title.value?.endsWith(".md")}
        title="Code input"
        placeholder="Enter multi-line text"
        {...itemProps.content}
      />
      <Form.Separator />

      <Form.Description text="Optional Settings" />
      <Form.Dropdown title="Visibility" {...itemProps.visibility}>
        <Form.Dropdown.Item value="UNLISTED" title="Unlisted" />
        <Form.Dropdown.Item value="PUBLIC" title="Public" />
        {folders === null ? null : <Form.Dropdown.Item value="PRIVATE" title="Private" />}
      </Form.Dropdown>
      <Form.Checkbox title="Checkbox" label="Client encrypted" storeValue {...itemProps.encrypted} />
      <Form.PasswordField {...itemProps.password} id="password" title="Password" />
      {folders === null ? null : (
        <Form.Dropdown isLoading={isLoading} id="folder" title="Folder">
          <Form.Dropdown.Item value="" title="None" />

          {folders?.map((folder: FolderListEntry) => (
            <Form.Dropdown.Item key={folder.id} value={folder.id} title={folder.path} />
          ))}
        </Form.Dropdown>
      )}
      <Form.DatePicker id="expire_at" title="Expire at" />
      {/* 
      TODO for the future if Pastefy will have support in it's frontend for it
      <Form.TagPicker id="tokeneditor" title="Tags">
        <Form.TagPicker.Item value="tagpicker-item" title="Codebox-Entry" />
      </Form.TagPicker> 
      */}
    </Form>
  );
}
