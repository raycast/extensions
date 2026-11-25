import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Account, authClient, connect, Folder, getAccount, getFolders, saveMessage } from "./lib/api";

interface Values {
  title: string;
  body: string;
  folderId: string;
}

export default function SaveMessage(props: LaunchProps<{ launchContext: { note?: string } }>) {
  const [account, setAccount] = useState<Account>();
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [title, setTitle] = useState(props.launchContext?.note || "");
  const [body, setBody] = useState("");
  const [folderId, setFolderId] = useState("");
  const [rememberedFolder, setRememberedFolder] = useState<Folder>();
  const searchGeneration = useRef(0);
  const submitting = useRef(false);
  const editRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await authClient().getTokens())?.accessToken) return;
        const user = await getAccount();
        if (!cancelled) {
          setAccount(user);
          setFolderId(user.homeFolder);
        }
      } catch (error) {
        if (!cancelled) await showFailureToast(error, { title: "Could Not Load Account" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!account) return;
    const generation = ++searchGeneration.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await getFolders(search);
        if (generation === searchGeneration.current) setFolders(result);
      } catch (error) {
        if (generation === searchGeneration.current) await showFailureToast(error, { title: "Could Not Load Folders" });
      } finally {
        if (generation === searchGeneration.current) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ++searchGeneration.current;
    };
  }, [account, search]);

  async function handleConnect() {
    setLoading(true);
    try {
      await connect();
      const user = await getAccount();
      setAccount(user);
      setFolderId(user.homeFolder);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Connect" });
    } finally {
      setLoading(false);
    }
  }

  async function submit(values: Values, task = false) {
    if (submitting.current || !account) return;
    submitting.current = true;
    const submittedRevision = editRevision.current;
    setLoading(true);
    try {
      await saveMessage(values.folderId || account.homeFolder, values.title, values.body, task);
      if (editRevision.current === submittedRevision) {
        setTitle("");
        setBody("");
        setSearch("");
        setFolderId(account.homeFolder);
        await showHUD("Saved to Luckynote");
      } else {
        // Keep the editor open with the newer draft and its selected folder.
        await showToast({ style: Toast.Style.Success, title: "Saved to Luckynote" });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Save Message" });
      if (!(await authClient().getTokens())?.accessToken) setAccount(undefined);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  if (!account)
    return (
      <Form
        isLoading={loading}
        actions={
          <ActionPanel>
            <Action title="Connect to Luckynote" icon={Icon.Link} onAction={handleConnect} />
          </ActionPanel>
        }
      >
        <Form.Description text="Connect through your browser. After signing in, you’ll return to Raycast automatically." />
      </Form>
    );

  const folderTitle = (folder: Folder) => (folder.path ? `${folder.title} (${folder.path})` : folder.title);
  const selectedFolder = folders.find((folder) => folder.id === folderId) ?? rememberedFolder;
  return (
    <Form
      isLoading={loading || searching}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Message" icon={Icon.Message} onSubmit={(values: Values) => submit(values)} />
          <Action.SubmitForm
            title="Save as Task"
            icon={Icon.Checkmark}
            onSubmit={(values: Values) => submit(values, true)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Note title (start with - for a task)"
        value={title}
        onChange={(value) => {
          ++editRevision.current;
          setTitle(value);
        }}
        autoFocus
      />
      <Form.Dropdown
        id="folderId"
        title="Folder"
        value={folderId}
        onChange={(value) => {
          ++editRevision.current;
          setFolderId(value);
          const picked = folders.find((folder) => folder.id === value);
          if (picked) setRememberedFolder(picked);
        }}
        filtering={false}
        onSearchTextChange={(value) => {
          ++editRevision.current;
          setSearch(value);
        }}
      >
        <Form.Dropdown.Item value={account.homeFolder} title="Inbox" icon={Icon.Tray} />
        {folderId && folderId !== account.homeFolder && selectedFolder?.id === folderId && (
          <Form.Dropdown.Item value={selectedFolder.id} title={folderTitle(selectedFolder)} />
        )}
        {folderId && folderId !== account.homeFolder && !selectedFolder && (
          <Form.Dropdown.Item value={folderId} title="Selected Folder" />
        )}
        {folders
          .filter((folder) => folder.id !== account.homeFolder && folder.id !== folderId)
          .map((folder) => (
            <Form.Dropdown.Item key={folder.id} value={folder.id} title={folderTitle(folder)} />
          ))}
      </Form.Dropdown>
      <Form.TextArea
        id="body"
        title="Message"
        placeholder="Your message (optional)"
        value={body}
        onChange={(value) => {
          ++editRevision.current;
          setBody(value);
        }}
      />
      <Form.Description text="Use ⌘⇧↵ to save as a task, or start the title with -." />
    </Form>
  );
}
