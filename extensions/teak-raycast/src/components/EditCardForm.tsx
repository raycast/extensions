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
import {
  explainPaletteEdit,
  MAX_PALETTE_COLORS,
  paletteHexes,
  parsePaletteHexList,
} from "../lib/paletteColors";

interface EditCardFormProps {
  card: RaycastCard;
  onCardUpdated: (next: RaycastCard) => void;
}

interface EditCardFormValues {
  addColors?: string;
  aiTags: string[];
  colors?: string[];
  content?: string;
  notes: string;
  tags: string;
}

const EDITABLE_CONTENT_TYPES = new Set(["text", "quote"]);

export function EditCardForm({ card, onCardUpdated }: EditCardFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colorsError, setColorsError] = useState<string | undefined>();

  const canEditContent = EDITABLE_CONTENT_TYPES.has(card.type);
  const isPalette = card.type === "palette" && !card.isDeleted;
  const currentHexes = useMemo(() => paletteHexes(card.colors), [card.colors]);
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

    const added = parsePaletteHexList(values.addColors);
    const removeColors = isPalette
      ? currentHexes.filter((hex) => !(values.colors ?? []).includes(hex))
      : [];
    const addColors = added.hexes.filter(
      (hex) => !currentHexes.includes(hex) || removeColors.includes(hex),
    );
    if (isPalette) {
      const problem = explainPaletteEdit(currentHexes, {
        add: addColors,
        invalid: added.invalid,
        remove: removeColors,
      });
      setColorsError(problem ?? undefined);
      if (problem) {
        return;
      }
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
          removeColors: removeColors.length > 0 ? removeColors : undefined,
          addColors: addColors.length > 0 ? addColors : undefined,
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
      {isPalette ? (
        <Form.TagPicker
          defaultValue={currentHexes}
          id="colors"
          info="Remove a color to take it out of the palette."
          title="Colors"
        >
          {currentHexes.map((hex) => (
            <Form.TagPicker.Item
              icon={{ source: Icon.CircleFilled, tintColor: hex }}
              key={hex}
              title={hex}
              value={hex}
            />
          ))}
        </Form.TagPicker>
      ) : null}
      {isPalette ? (
        <Form.TextField
          error={colorsError}
          id="addColors"
          info={`Hex codes, separated by commas. A palette holds up to ${MAX_PALETTE_COLORS} colors.`}
          onChange={() => setColorsError(undefined)}
          placeholder="#FF5500, 2A9D8F"
          title="Add Colors"
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
