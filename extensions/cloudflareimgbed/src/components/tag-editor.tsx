import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ImgBedClient } from "../api/client";
import { parseTagsInput } from "../utils/tags";
import { getTopTags, recordUserTagUsage } from "../utils/tag-store";

type TagEditorProps = {
  fileId: string;
  initialTags: string[];
  onSubmitted: (tags: string[]) => void;
};

export function TagEditor({ fileId, initialTags, onSubmitted }: TagEditorProps) {
  const client = useMemo(() => new ImgBedClient(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  useEffect(() => {
    void getTopTags(10).then((tags) => setSuggestedTags(tags));
  }, []);

  const displayTags = useMemo(() => {
    const combined: string[] = [];
    const pushUnique = (tag: string) => {
      const normalized = tag.toLowerCase();
      if (!combined.some((existing) => existing.toLowerCase() === normalized)) {
        combined.push(tag);
      }
    };
    initialTags.forEach(pushUnique);
    suggestedTags.forEach(pushUnique);
    return combined.slice(0, 10);
  }, [initialTags, suggestedTags]);

  const initialSet = useMemo(() => new Set(initialTags.map((tag) => tag.toLowerCase())), [initialTags]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const selectedTags = displayTags.filter((tag) => Boolean(values[`tag_${tag}`]));
      const customTags = parseTagsInput(values.customTags as string | undefined);
      const tags = Array.from(new Set([...selectedTags, ...customTags]));
      const updated = await client.updateTags(fileId, { action: "set", tags });
      const addedTags = tags.filter((tag) => !initialSet.has(tag.toLowerCase()));
      if (addedTags.length) {
        await recordUserTagUsage(addedTags);
      }
      onSubmitted(updated);
      await showToast(Toast.Style.Success, "Tags updated");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to update tags", (error as Error).message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tags" onSubmit={(values) => void handleSubmit(values as { tags?: string })} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="customTags"
        title="Custom Tags"
        placeholder="Separate with commas or spaces, e.g., Landscape, Travel"
      />
      {displayTags.map((tag) => (
        <Form.Checkbox key={tag} id={`tag_${tag}`} label={`#${tag}`} defaultValue={initialSet.has(tag.toLowerCase())} />
      ))}
    </Form>
  );
}
