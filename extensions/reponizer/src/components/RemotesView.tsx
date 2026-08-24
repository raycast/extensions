import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { git } from "../lib/git";
import { listRemotes } from "../lib/offload";
import {
  convertProtocol,
  expectedOriginFor,
  parseRemoteUrl,
  protocolOf,
  remotesMatch,
  webUrlFor,
} from "../lib/remotes";
import { getConfig } from "../lib/config";
import type { Protocol, RemoteInfo, Repo } from "../lib/types";
import { errorMessage } from "../lib/util";

interface RemoteFormProps {
  repoPath: string;
  existing?: RemoteInfo;
  onDone: () => Promise<void>;
}

function RemoteForm({ repoPath, existing, onDone }: RemoteFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(existing?.name ?? "");
  const [url, setUrl] = useState(existing?.fetchUrl ?? "");
  const [nameError, setNameError] = useState<string>();
  const [urlError, setUrlError] = useState<string>();

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!/^[A-Za-z0-9][\w.-]*$/.test(trimmedName)) {
      setNameError("Must start with a letter or digit; letters, digits, dots, dashes, and underscores only.");
      return;
    }
    if (!parseRemoteUrl(trimmedUrl)) {
      setUrlError("Not a valid git remote URL.");
      return;
    }
    try {
      if (existing) {
        if (trimmedName !== existing.name) {
          await git(repoPath, ["remote", "rename", existing.name, trimmedName]);
        }
        if (trimmedUrl !== existing.fetchUrl) {
          await git(repoPath, ["remote", "set-url", trimmedName, trimmedUrl]);
        }
      } else {
        await git(repoPath, ["remote", "add", trimmedName, trimmedUrl]);
      }
      await onDone();
      await showToast({ style: Toast.Style.Success, title: existing ? "Remote updated" : "Remote added" });
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Git command failed", message: errorMessage(error) });
    }
  };

  return (
    <Form
      navigationTitle={existing ? `Edit Remote “${existing.name}”` : "Add Remote"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existing ? "Save Remote" : "Add Remote"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="origin"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="git@github.com:owner/repo.git"
        value={url}
        error={urlError}
        onChange={(value) => {
          setUrl(value);
          setUrlError(undefined);
        }}
      />
    </Form>
  );
}

export function RemotesView({ repo, onChanged }: { repo: Repo; onChanged: () => Promise<void> }) {
  const config = getConfig();
  const [remotes, setRemotes] = useState<RemoteInfo[]>(repo.remotes);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setRemotes(await listRemotes(repo.fullPath));
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not read remotes", message: errorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }, [repo.fullPath]);

  useEffect(() => {
    reload();
  }, [reload]);

  const changed = useCallback(async () => {
    await reload();
    await onChanged();
  }, [reload, onChanged]);

  const expectedUrl = expectedOriginFor(repo.relativePath, config.defaultProtocol);

  const removeRemote = async (remote: RemoteInfo) => {
    const confirmed = await confirmAlert({
      title: `Delete Remote “${remote.name}”`,
      message: remote.fetchUrl,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await git(repo.fullPath, ["remote", "remove", remote.name]);
      await changed();
      await showToast({ style: Toast.Style.Success, title: "Remote deleted" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not delete remote", message: errorMessage(error) });
    }
  };

  const switchProtocol = async (remote: RemoteInfo, to: Protocol) => {
    const converted = convertProtocol(remote.fetchUrl, to);
    if (!converted) {
      await showToast({ style: Toast.Style.Failure, title: "URL could not be converted" });
      return;
    }
    try {
      await git(repo.fullPath, ["remote", "set-url", remote.name, converted]);
      await changed();
      await showToast({ style: Toast.Style.Success, title: `Switched to ${to.toUpperCase()}`, message: converted });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not switch protocol", message: errorMessage(error) });
    }
  };

  const setToExpected = async (remote: RemoteInfo) => {
    if (!expectedUrl) return;
    try {
      await git(repo.fullPath, ["remote", "set-url", remote.name, expectedUrl]);
      await changed();
      await showToast({ style: Toast.Style.Success, title: "Remote updated", message: expectedUrl });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not update remote", message: errorMessage(error) });
    }
  };

  const addAction = (
    <Action.Push
      title="Add Remote"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<RemoteForm repoPath={repo.fullPath} onDone={changed} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Remotes — ${repo.name}`}
      searchBarPlaceholder="Search remotes…"
      actions={<ActionPanel>{addAction}</ActionPanel>}
    >
      <List.EmptyView
        title="No Remotes"
        description={expectedUrl ? `Suggested origin: ${expectedUrl}` : "Add a remote to get started."}
        icon={Icon.Globe}
      />
      {remotes.map((remote) => {
        const protocol = protocolOf(remote.fetchUrl);
        const otherProtocol: Protocol = protocol === "https" ? "ssh" : "https";
        const matchesExpected = expectedUrl ? remotesMatch(remote.fetchUrl, expectedUrl) : false;
        const webUrl = webUrlFor(remote.fetchUrl);
        return (
          <List.Item
            key={remote.name}
            icon={remote.name === "origin" ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Globe}
            title={remote.name}
            subtitle={remote.fetchUrl}
            accessories={[
              { tag: protocol ?? "?" },
              ...(remote.name === "origin" && expectedUrl && !matchesExpected
                ? [{ icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip: `Expected: ${expectedUrl}` }]
                : []),
              ...(remote.pushUrl && remote.pushUrl !== remote.fetchUrl
                ? [{ icon: Icon.Upload, tooltip: `Push URL: ${remote.pushUrl}` }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Remote"
                    icon={Icon.Pencil}
                    target={<RemoteForm repoPath={repo.fullPath} existing={remote} onDone={changed} />}
                  />
                  {addAction}
                  <Action
                    title={`Switch to ${otherProtocol.toUpperCase()}`}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
                    onAction={() => switchProtocol(remote, otherProtocol)}
                  />
                  {expectedUrl && !matchesExpected && (
                    <Action title="Set to Expected URL" icon={Icon.Wand} onAction={() => setToExpected(remote)} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy URL" content={remote.fetchUrl} />
                  {webUrl && <Action.OpenInBrowser title="Open in Browser" url={webUrl} />}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Remote"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => removeRemote(remote)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
