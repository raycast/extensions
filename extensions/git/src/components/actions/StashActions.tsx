import { ActionPanel, Action, Icon, confirmAlert, Alert, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { FileStatus, StashScope, Stash } from "../../types";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { basename } from "path";

/**
 * Action for applying a stash.
 */
export function StashApplyAction(context: RepositoryContext & NavigationContext & { stash: Stash; index: number }) {
  const handleApply = async () => {
    if (
      await confirmAlert({
        title: "Apply Stash?",
        message: `Are you sure you want to apply "${context.stash.message}"?`,
        primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
      })
    ) {
      try {
        await context.gitManager.applyStash(context.index);
        context.status.revalidate();

        // Ask if user wants to drop the applied stash
        if (
          await confirmAlert({
            title: "Drop Applied Stash?",
            message: `Stash "${context.stash.message}" has been applied. Do you want to drop it?`,
            primaryAction: {
              title: "Drop",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          await context.gitManager.dropStash(context.index);
          context.stashes.revalidate();
        }

        // Automatically switch to StatusView after applying stash
        context.navigateTo("status");
      } catch {
        // Git error is already shown by GitManager
      }
    }
  };

  return <Action title="Apply Stash" icon={Icon.Bookmark} onAction={handleApply} />;
}

/**
 * Action for dropping a stash.
 */
export function StashDropAction(context: RepositoryContext & NavigationContext & { stash: Stash; index: number }) {
  const handleDrop = async () => {
    const confirmed = await confirmAlert({
      title: "Drop Stash?",
      message: `Are you sure you want to drop "${context.stash.message}"? This action cannot be undone.`,
      primaryAction: {
        title: "Drop",

        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await context.gitManager.dropStash(context.index);
      context.stashes.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Drop Stash"
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      onAction={handleDrop}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

export function StashCreateAction(context: RepositoryContext & { file?: FileStatus }) {
  return (
    <ActionPanel.Submenu title="Create Stash" icon={Icon.Bookmark} shortcut={{ modifiers: ["cmd"], key: "s" }}>
      <Action.Push title="All Changes" target={<StashCreateForm scope="all" {...context} />} />
      {context.file && (
        <Action.Push
          title={`Only ${basename(context.file.absolutePath)}`}
          target={<StashCreateForm scope={{ filePath: context.file.absolutePath }} {...context} />}
        />
      )}
      <Action.Push title="Only Staged" target={<StashCreateForm scope="staged" {...context} />} />
      <Action.Push title="Only Unstaged" target={<StashCreateForm scope="unstaged" {...context} />} />
    </ActionPanel.Submenu>
  );
}

function StashCreateForm(context: RepositoryContext & { scope: StashScope }) {
  const { pop } = useNavigation();
  const [message, setMessage] = useState("");

  const handleSubmit = async (values: { message: string }) => {
    try {
      await context.gitManager.stash(values.message, context.scope);
      context.stashes.revalidate();
      pop();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      navigationTitle={"Create Stash"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Create Stash"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="message"
        title="Stash Message"
        placeholder="Describe the changes being stashed"
        info="Optional"
        error={message.trim().length === 0 ? "Required" : undefined}
        value={message}
        onChange={setMessage}
      />
    </Form>
  );
}

/**
 * Action for renaming a stash.
 */
export function StashRenameAction(context: RepositoryContext & NavigationContext & { stash: Stash; index: number }) {
  return (
    <Action.Push
      title="Rename Stash"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<StashRenameForm {...context} />}
    />
  );
}

function StashRenameForm(context: RepositoryContext & NavigationContext & { stash: Stash; index: number }) {
  const { pop } = useNavigation();
  const [newName, setNewName] = useState(context.stash.message);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { newName: string }) => {
    setIsLoading(true);
    try {
      await context.gitManager.renameStash(context.index, context.stash, values.newName);
      context.stashes.revalidate();
      pop();
    } catch {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle="Rename Stash"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Stash" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="Stash Name"
        placeholder="New stash name"
        error={newName.trim().length === 0 ? "Required" : undefined}
        value={newName}
        onChange={setNewName}
      />
    </Form>
  );
}
