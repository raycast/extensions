import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef } from "react";
import type { TagSummary } from "../lib/api";
import { changeTagWithFeedback } from "../lib/tagOperations";

// Teak's own limit on a tag's length.
const MAX_TAG_LENGTH = 64;

interface TagChangeProps {
  onFinished: () => void;
  tag: TagSummary;
}

export function RenameTagForm({ onFinished, tag }: TagChangeProps) {
  const { pop } = useNavigation();
  // The form stays open while Teak starts the rename, so a second ⌘↵ waits.
  const submittingRef = useRef<boolean>(false);
  // Leaving the form before Teak answers means `pop` would close another view.
  const isOpenRef = useRef<boolean>(true);
  useEffect(() => {
    isOpenRef.current = true;
    return () => {
      isOpenRef.current = false;
    };
  }, []);

  const handleSubmit = async (values: { name: string }) => {
    if (submittingRef.current) {
      return;
    }
    const name = values.name.trim();
    if (!name || name.length > MAX_TAG_LENGTH) {
      await showToast({
        message: name
          ? `Tags can be at most ${MAX_TAG_LENGTH} characters.`
          : "Name the tag to rename it.",
        style: Toast.Style.Failure,
        title: "Check the tag name",
      });
      return;
    }
    if (name === tag.name) {
      pop();
      return;
    }
    // The form stays until Teak takes the new name, so a refusal (the name
    // is taken) keeps what was typed.
    submittingRef.current = true;
    try {
      await changeTagWithFeedback(
        { kind: "rename", tag: tag.name, to: name },
        onFinished,
        () => {
          if (isOpenRef.current) {
            pop();
          }
        },
      );
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
            title="Rename Tag"
          />
        </ActionPanel>
      }
      navigationTitle={`Rename "${tag.name}"`}
    >
      <Form.TextField
        defaultValue={tag.name}
        id="name"
        info="Every card with this tag gets the new name."
        title="New Name"
      />
    </Form>
  );
}

interface MergeTagListProps extends TagChangeProps {
  tags: TagSummary[];
}

export function MergeTagList({ onFinished, tag, tags }: MergeTagListProps) {
  const { pop } = useNavigation();
  const targets = useMemo(
    () => tags.filter((other) => other.name !== tag.name),
    [tag.name, tags],
  );

  const handleMerge = async (target: TagSummary) => {
    const confirmed = await confirmAlert({
      icon: Icon.Tag,
      message: `Every card tagged "${tag.name}" gets "${target.name}" instead, and "${tag.name}" goes away.`,
      primaryAction: { title: "Merge" },
      title: `Merge "${tag.name}" into "${target.name}"?`,
    });
    if (!confirmed) {
      return;
    }
    pop();
    await changeTagWithFeedback(
      { into: target.name, kind: "merge", tag: tag.name },
      onFinished,
    );
  };

  return (
    <List
      navigationTitle={`Merge "${tag.name}" into…`}
      searchBarPlaceholder="Find the tag to merge into…"
    >
      {targets.length === 0 ? (
        <List.EmptyView
          description="Add another tag to merge this one into."
          icon={Icon.Tag}
          title="No other tags"
        />
      ) : null}
      {targets.map((target) => (
        <List.Item
          accessories={[
            { tag: { color: Color.Blue, value: `${target.count}` } },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Tag}
                onAction={() => void handleMerge(target)}
                title={`Merge into "${target.name}"`}
              />
            </ActionPanel>
          }
          icon={Icon.Tag}
          key={target.name}
          title={target.name}
        />
      ))}
    </List>
  );
}

/** Asks first, then deletes the tag from every card; true when it went ahead. */
export const confirmAndDeleteTag = async (
  tag: TagSummary,
  onFinished: () => void,
): Promise<boolean> => {
  const confirmed = await confirmAlert({
    icon: Icon.Trash,
    message: `This removes "${tag.name}" from ${tag.count} card${tag.count === 1 ? "" : "s"}, including cards in Trash and Archive. The cards stay.`,
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
    title: `Delete the tag "${tag.name}"?`,
  });
  if (!confirmed) {
    return false;
  }
  return changeTagWithFeedback({ kind: "delete", tag: tag.name }, onFinished);
};
