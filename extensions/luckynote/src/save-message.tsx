import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
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
        if (!cancelled)
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Load Account",
            message: error instanceof Error ? error.message : "Please try again.",
          });
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
        if (generation === searchGeneration.current)
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Load Folders",
            message: error instanceof Error ? error.message : "Please try again.",
          });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Connect",
        message: error instanceof Error ? error.message : "Please try again.",
      });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Message",
        message: error instanceof Error ? error.message : "Please try again.",
      });
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

  const selectedFolder = folders.find((folder) => folder.id === folderId);
  return (
    <Form
      isLoading={loading || searching}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Message" icon={Icon.Message} onSubmit={(values: Values) => submit(values)} />
          <Action.SubmitForm
            title="Save as Task"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
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
        }}
        filtering={false}
        onSearchTextChange={(value) => {
          ++editRevision.current;
          setSearch(value);
        }}
      >
        <Form.Dropdown.Item value={account.homeFolder} title="Inbox" icon={Icon.Tray} />
        {folderId && folderId !== account.homeFolder && !selectedFolder && (
          <Form.Dropdown.Item value={folderId} title="Selected Folder" />
        )}
        {folders
          .filter((folder) => folder.id !== account.homeFolder)
          .map((folder) => (
            <Form.Dropdown.Item
              key={folder.id}
              value={folder.id}
              title={folder.path ? `${folder.title} (${folder.path})` : folder.title}
            />
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
