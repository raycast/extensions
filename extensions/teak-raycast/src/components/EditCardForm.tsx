import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { parseTags } from "teak-sdk";
import type { RaycastCard } from "../lib/api";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  updateCard,
} from "../lib/api";
import { hiddenAfterTaggingMessage, newlyHiddenTag } from "../lib/hiddenTags";

interface EditCardFormProps {
  card: RaycastCard;
  onCardUpdated: (next: RaycastCard) => void;
}

interface EditCardFormValues {
  aiTags: string[];
  content?: string;
  notes: string;
  tags: string;
}

const EDITABLE_CONTENT_TYPES = new Set(["text", "quote"]);

export function EditCardForm({ card, onCardUpdated }: EditCardFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEditContent = EDITABLE_CONTENT_TYPES.has(card.type);
  const initialValues = useMemo<EditCardFormValues>(
    () => ({
      aiTags: card.aiTags,
      content: card.content,
      notes: card.notes ?? "",
      tags: card.tags.join(", "),
    }),
    [card.aiTags, card.content, card.notes, card.tags],
  );

  const handleSubmit = async (values: EditCardFormValues) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving card changes...",
    });

    try {
      const removeAiTags = card.aiTags.filter(
        (tag) => !values.aiTags.includes(tag),
      );
      const content =
        canEditContent && values.content !== card.content
          ? values.content
          : undefined;
      const updated = await updateCard(
        card.id,
        {
          content,
          notes: values.notes.trim() ? values.notes.trim() : null,
          removeAiTags: removeAiTags.length > 0 ? removeAiTags : undefined,
          tags: parseTags(values.tags) ?? [],
        },
        "interactive",
      );
      onCardUpdated(updated);
      toast.style = Toast.Style.Success;
      toast.title = "Card updated";
      const hiddenTag = newlyHiddenTag(card.tags, updated.tags);
      if (hiddenTag) {
        toast.message = hiddenAfterTaggingMessage(hiddenTag);
      }
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      const hint = getRecoveryHint(error);
      toast.message = hint
        ? `${getUserFacingErrorMessage(error)} ${hint}`
        : getUserFacingErrorMessage(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
            title={isSubmitting ? "Saving..." : "Save Changes"}
          />
        </ActionPanel>
      }
      navigationTitle="Edit Card"
    >
      {canEditContent ? (
        <Form.TextArea
          defaultValue={initialValues.content}
          enableMarkdown={card.type === "text"}
          id="content"
          title={card.type === "quote" ? "Quote" : "Content"}
        />
      ) : null}
      <Form.TextArea
        defaultValue={initialValues.notes}
        id="notes"
        placeholder="Add notes for this card..."
        title="Notes"
      />
      <Form.TextField
        defaultValue={initialValues.tags}
        id="tags"
        placeholder="design, research, inspiration"
        title="Tags"
      />
      {card.aiTags.length > 0 ? (
        <Form.TagPicker
          defaultValue={initialValues.aiTags}
          id="aiTags"
          info="Tags Teak added. Remove any that don't fit."
          title="Teak Tags"
        >
          {card.aiTags.map((tag) => (
            <Form.TagPicker.Item key={tag} title={tag} value={tag} />
          ))}
        </Form.TagPicker>
      ) : null}
    </Form>
  );
}
