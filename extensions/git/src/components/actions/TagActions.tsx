import {
  Action,
  Icon,
  confirmAlert,
  Alert,
  ActionPanel,
  useNavigation,
  showToast,
  Toast,
  Form,
  List,
  Keyboard,
  Color,
} from "@raycast/api";
import { Tag } from "../../types";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { ConcreteCommitView } from "../views/CommitDetailsView";
import { useToggleDetail } from "./ToggleDetailAction";
import { RemoteWebPageAction } from "./RemoteActions";

/**
 * Action for creating a tag on a commit.
 */
export function TagCreateAction(
  context: RepositoryContext & {
    ref: string;
    shortcut?: Keyboard.Shortcut;
  },
) {
  return (
    <Action.Push
      title="Create New Tag"
      target={<TagCreateForm {...context} />}
      icon={Icon.Plus}
      shortcut={context.shortcut}
    />
  );
}

/**
 * Action for removing a tag from a commit.
 */
export function TagRemoveAction(context: RepositoryContext & { tagName: string }) {
  const handleRemoveTag = async (remote?: string) => {
    const confirmed = await confirmAlert({
      title: "Remove tag",
      message: `Are you sure you want to remove tag "${context.tagName}"?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      if (remote) {
        await context.gitManager.pushTag(context.tagName, remote, true);
      }

      if (Object.keys(context.remotes.data).length === 1) {
        const confirmed = await confirmAlert({
          title: "Delete remote tag",
          message: `Also delete remote tag?`,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          await context.gitManager.pushTag(context.tagName, Object.keys(context.remotes.data)[0], true);
          context.commits.revalidate();
        }
      }

      await context.gitManager.deleteTag(context.tagName);
      context.commits.revalidate();
      context.tags.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  if (Object.keys(context.remotes.data).length <= 1) {
    return (
      <Action
        title={`Remove Tag`}
        onAction={() => handleRemoveTag(undefined)}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title={`Remove Tag from`}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    >
      <Action title={`Local Only`} onAction={() => handleRemoveTag(undefined)} icon={Icon.Dot} />
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:remove-tag`}
          title={`Local and ${remote}`}
          onAction={() => handleRemoveTag(remote)}
          icon={RemoteHostIcon(context.remotes.data[remote])}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for checking out a tag (detached HEAD).
 */
export function TagCheckoutAction(context: RepositoryContext & NavigationContext & { tagName: string }) {
  const handleCheckout = async () => {
    const confirmed = await confirmAlert({
      title: "Checkout Tag",
      message: `Are you sure you want to checkout tag "${context.tagName}"? This will put HEAD into detached state.`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;

    try {
      await context.gitManager.checkoutTag(context.tagName);
      context.status.revalidate();
      context.branches.revalidate();
      context.commits.revalidate();
      context.navigateTo("status");
    } catch {
      // handled by GitManager
    }
  };

  return <Action title="Checkout Tag" onAction={handleCheckout} icon={`arrow-checkout.svg`} />;
}

/**
 * Action for pushing a tag to remote.
 */
export function TagsPushAction(context: RepositoryContext) {
  const handlePush = async (remote: string) => {
    try {
      await context.gitManager.pushTags(remote);
      context.tags.revalidate();
    } catch {
      // handled by GitManager
    }
  };

  if (Object.keys(context.remotes.data).length === 0) {
    return null;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Push Tags"
        icon={`git-push.svg`}
        onAction={() => handlePush(Object.keys(context.remotes.data)[0])}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Push Tags to"
      icon={`git-push.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:push-tag`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote])}
          onAction={() => handlePush(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for renaming a tag.
 */
export function TagRenameAction(context: RepositoryContext & { tagName: string }) {
  return (
    <Action.Push
      title="Rename"
      icon={{ source: Icon.Pencil, tintColor: Color.Yellow }}
      target={<TagRenameForm {...context} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

function TagRenameForm(context: RepositoryContext & { tagName: string }) {
  const { pop } = useNavigation();
  const [newName, setNewName] = useState(context.tagName);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: { newName: string }) => {
    setIsLoading(true);
    try {
      await context.gitManager.renameTag(context.tagName, values.newName);
      context.commits.revalidate();
      context.tags.revalidate();
      pop();
    } catch {
      // handled by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle={`Rename Tag '${context.tagName}'`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New Name"
        value={newName}
        onChange={setNewName}
        placeholder="x.y.z"
        error={newName.trim().length === 0 ? "Required" : undefined}
      />
    </Form>
  );
}

/**
 * Action to open tag details.
 */
export function TagDetailsView(
  context: RepositoryContext &
    NavigationContext & {
      index: number;
      onMoveToTag: (tagName: string) => void;
    },
) {
  const [currentIndex, setCurrentIndex] = useState(context.index);
  const toggleController = useToggleDetail("Tag Details", "Diff", false);

  const { data: commit, isLoading } = usePromise(
    async (index: number) => {
      return await context.gitManager.getCommitByHash(context.tags.data[index].commitHash);
    },
    [currentIndex],
  );

  const switchToCommit = async (direction: "next" | "previous") => {
    let nextIndex = currentIndex;
    switch (direction) {
      case "previous":
        nextIndex = currentIndex + 1;
        break;
      case "next":
        nextIndex = currentIndex - 1;
        break;
    }

    if (nextIndex < 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No more tags",
        message: "This is the last tag in the repository.",
      });
      return;
    }

    if (nextIndex >= context.tags.data.length) {
      showToast({
        style: Toast.Style.Failure,
        title: "No more tags",
        message: "This is the last tag in the repository.",
      });
      return;
    }

    setCurrentIndex(nextIndex);
    context.onMoveToTag(context.tags.data[nextIndex].name);
  };

  if (isLoading || !commit) {
    return (
      <List
        isLoading={isLoading}
        navigationTitle={`Commit Changes`}
        searchBarPlaceholder="Search files by name, path..."
      >
        <List.EmptyView
          title={`Loading tag ${context.tags.data[currentIndex].name}...`}
          description="Please wait while we load the tag details..."
          icon={Icon.Hourglass}
        />
      </List>
    );
  }

  return (
    <ConcreteCommitView
      {...context}
      commit={commit}
      navigationTitle={context.tags.data[currentIndex].name}
      toggleController={toggleController}
      onMoveToCommit={switchToCommit}
    />
  );
}

function TagCreateForm(context: RepositoryContext & { ref: string }) {
  const { pop } = useNavigation();
  const [tagName, setTagName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (remote?: string) => {
    setIsLoading(true);
    try {
      // Create the tag
      await context.gitManager.createTag(tagName.trim(), context.ref, message.trim() || undefined);

      if (!remote) {
        remote = Object.keys(context.remotes.data)[0];
      }

      if (remote) {
        // Show confirmation alert for pushing tags
        const shouldPushTags = await confirmAlert({
          title: "Push tags to remote?",
          message: `Also push tag to remote?`,
          primaryAction: {
            title: "Push",
            style: Alert.ActionStyle.Destructive,
          },
          dismissAction: {
            title: "Don't Push",
          },
        });

        if (shouldPushTags) {
          await context.gitManager.pushTag(tagName.trim(), remote);
          await showToast({
            style: Toast.Style.Success,
            title: `Tags pushed to ${remote}`,
          });
        }
      }

      // Refresh the commits list
      context.commits.revalidate();
      context.tags.revalidate();
      pop();
    } catch {
      // Git error is already shown by GitManager
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={`Create Tag`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Create Tag" onAction={() => handleSubmit(undefined)} icon={Icon.Tag} />
          <TagCreateAndPushAction {...context} handleSubmit={(remote) => handleSubmit(remote)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tagName"
        title="Tag Name"
        placeholder="e.g., v1.0.0"
        value={tagName}
        onChange={setTagName}
        error={tagName.trim() === "" ? "Required" : undefined}
      />
      <Form.TextArea
        id="message"
        title="Tag Message"
        placeholder="Release description..."
        value={message}
        onChange={setMessage}
        info="Optional message for annotated tag"
      />
      <Form.Description text={`From '${context.ref}'`} />
    </Form>
  );
}

function TagCreateAndPushAction(
  context: RepositoryContext & {
    ref: string;
    handleSubmit: (remote: string) => void;
  },
) {
  if (Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Create Tag and Push"
        onAction={() => context.handleSubmit(Object.keys(context.remotes.data)[0])}
        icon={Icon.Tag}
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Create Tag and Push to" icon={Icon.Tag}>
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:create-tag-and-push`}
          title={remote}
          onAction={() => context.handleSubmit(remote)}
          icon={RemoteHostIcon(context.remotes.data[remote])}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for opening the attached links of a tag.
 */
export function TagAttachedLinksAction(context: RepositoryContext & { tag: Tag }) {
  return (
    <ActionPanel.Submenu title="Open Link to" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "l" }}>
      <RemoteWebPageAction.Menu remotes={context.remotes.data}>
        {(remote) => (
          <>
            <RemoteWebPageAction.Tag remote={remote} tag={context.tag.name} />
            <RemoteWebPageAction.Base remote={remote} />
          </>
        )}
      </RemoteWebPageAction.Menu>
    </ActionPanel.Submenu>
  );
}
