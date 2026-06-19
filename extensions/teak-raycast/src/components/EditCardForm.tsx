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
import type { RaycastCard } from "../lib/api";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  updateCard,
} from "../lib/api";

type EditCardFormProps = {
  card: RaycastCard;
  onCardUpdated: (next: RaycastCard) => void;
};

type EditCardFormValues = {
  notes: string;
  tags: string;
};

const parseTags = (value: string): string[] => {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
};

export function EditCardForm({ card, onCardUpdated }: EditCardFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = useMemo<EditCardFormValues>(
    () => ({
      notes: card.notes ?? "",
      tags: card.tags.join(", "),
    }),
    [card.notes, card.tags],
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
      const updated = await updateCard(card.id, {
        notes: values.notes.trim() ? values.notes.trim() : null,
        tags: parseTags(values.tags),
      });
      onCardUpdated(updated);
      toast.style = Toast.Style.Success;
      toast.title = "Card updated";
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
      navigationTitle="Edit Tags & Notes"
    >
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
    </Form>
  );
}
