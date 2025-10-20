import { AI, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { SuggestAndApplyProps } from "../types";

export const useRaycastAi = () => {
  const [newlyCreatedTags, setNewlyCreatedTags] = useState<string[]>([]);

  const suggestAndApply = async ({
    link,
    title,
    collections,
    tags,
    currentTags,
    setValue,
    setDropdownValue,
  }: SuggestAndApplyProps) => {
    if (!link) {
      showToast({
        style: Toast.Style.Failure,
        title: "Link is empty",
        message: "Please enter a link to get suggestions.",
      });
      return;
    }

    const collectionsText = collections.map((c) => `${c.title} (ID: ${c._id})`).join("\n");
    const existingTagsText = tags?.items?.map((t) => t._id).join(", ") || "No existing tags.";

    const prompt = `Analyze the content of the webpage at the given URL and the provided context.
Based on the analysis, suggest a collection, tags, and a description.

URL: ${link}
Title: ${title}

Available Collections (choose one ID from this list):
${collectionsText}

Existing Tags (you can reuse them or create new ones):
${existingTagsText}

The output must be a JSON object with the following schema:
{
  "collectionId": "string",
  "tags": ["string"],
  "description": "string"
}`;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Asking Raycast AI for suggestions..." });

      const result = await AI.ask(prompt);

      const jsonString = result.match(/```json\n([\s\S]*?)\n```/)?.[1] || result;

      const suggestions = JSON.parse(jsonString) as {
        collectionId: string;
        tags: string[];
        description: string;
      };

      await showToast({ style: Toast.Style.Success, title: "Got suggestions from Raycast AI!" });

      if (suggestions) {
        if (suggestions.collectionId) {
          const isValidCollectionId = collections.some((c) => c._id.toString() === suggestions.collectionId.toString());
          if (isValidCollectionId) {
            setValue("collection", suggestions.collectionId);
            setDropdownValue(suggestions.collectionId);
          } else {
            console.log("Invalid collectionId from Raycast AI:", suggestions.collectionId);
            showToast({
              style: Toast.Style.Failure,
              title: "AI returned an invalid collection",
            });
          }
        } else {
          console.log("collectionId missing from Raycast AI response");
        }

        if (suggestions.tags && suggestions.tags.length > 0) {
          const existingTags = tags?.items?.map(({ _id }) => _id) ?? [];
          const newTags = suggestions.tags.filter((tag) => !existingTags.includes(tag));
          if (newTags.length > 0) {
            showToast({
              title: "New tags added",
              message: `Added new tags: ${newTags.join(", ")}`,
            });
            setNewlyCreatedTags((prev) => [...new Set([...prev, ...newTags])]);
          }
          const updatedTags = [...new Set([...(currentTags || []), ...suggestions.tags])];
          setValue("tags", updatedTags);
        }
      }
    } catch (error) {
      console.error("Error getting suggestions from Raycast AI:", error);
      await showToast({ style: Toast.Style.Failure, title: "Couldn't get suggestions from Raycast AI" });
    }
  };

  return { suggestAndApply, newlyCreatedTags };
};
