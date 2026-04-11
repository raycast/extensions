import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { handleApiError, updatePageTags } from "../api/client";

/**
 * Parse raw user input into a clean, validated tag array.
 *
 * Constraints from the API:
 *  - Max 10 tags
 *  - Each tag max 30 chars
 *  - Lowercase alphanumeric + hyphens only
 *  - No duplicates
 *
 * @param raw - The raw string from the form field (comma-separated)
 * @returns Clean array of valid tags
 */
export function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) =>
          t
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, ""),
        )
        .filter(Boolean)
        .map((t) => t.slice(0, 30)),
    ),
  ].slice(0, 10);
}

export default function EditTagsForm({
  pageId,
  currentTags,
  onUpdated,
}: {
  pageId: string;
  currentTags: string[];
  onUpdated?: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { tags: string }) {
    const tags = parseTags(values.tags);

    setIsSubmitting(true);
    try {
      await updatePageTags(pageId, tags);
      await showToast({
        style: Toast.Style.Success,
        title: "Tags Updated",
        message: tags.length > 0 ? tags.join(", ") : "All tags removed",
      });
      onUpdated?.();
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update tags",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Edit Tags"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Tags"
            icon={Icon.Tag}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={currentTags.join(", ")}
        placeholder="react, typescript, tutorial"
      />
      <Form.Description text="Comma-separated. Max 10 tags, 30 chars each. Letters, numbers, and hyphens only." />
    </Form>
  );
}
