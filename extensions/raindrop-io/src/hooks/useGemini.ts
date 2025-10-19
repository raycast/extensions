import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FormValues } from "../types";
import { UseFormSetValue } from "@raycast/utils";
import { useState } from "react";

type Collection = {
  _id: string;
  title: string;
};

type SuggestAndApplyProps = {
  link: string;
  collections: Collection[];
  tags: { items: { _id: string }[] } | undefined;
  currentTags: string[];
  setValue: UseFormSetValue<FormValues>;
  setDropdownValue: (value: string) => void;
};

export const useGemini = () => {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.geminiApiKey;
  const isConfigured = !!apiKey;
  const [newlyCreatedTags, setNewlyCreatedTags] = useState<string[]>([]);

  const suggestAndApply = async ({
    link,
    collections,
    tags,
    currentTags,
    setValue,
    setDropdownValue,
  }: SuggestAndApplyProps) => {
    if (!isConfigured) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Gemini API Key",
        message: "Please set your Gemini API key in the extension preferences.",
      });
      return;
    }

    if (!link) {
      showToast({
        style: Toast.Style.Failure,
        title: "Link is empty",
        message: "Please enter a link to get suggestions.",
      });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite-preview-06-17",
      systemInstruction: `
You are a JSON-only generator. You must respond **only** with a valid JSON object — no natural language, no markdown, no explanations, and no text before or after the JSON.

Output must strictly conform to this schema:
{
  "collectionId": "string (must be one of the provided collection IDs)",
  "tags": ["string", ... up to 5 single words],
  "description": "string",
  "title": "string"
}

If you are uncertain, still produce syntactically valid JSON with empty strings or empty arrays, not explanations.
`,
    });

    const collectionsText = collections.map((c) => `${c.title} (ID: ${c._id})`).join("\n");

    const existingTagsText = tags?.items?.map((t) => t._id).join(", ") || "No existing tags.";

    const prompt = `
Analyze the following link and context. Suggest:
1. The most relevant "collectionId" from the given list (must match exactly one from Collections).
2. Up to 5 concise single-word "tags" (reuse from existing tags if possible; only invent new if necessary).
3. A short "description" of the link.
4. A concise "title" for it.

Input:
Link: ${link}

Collections:
${collectionsText}

Existing Tags:
${existingTagsText}

Return **only** a JSON object that matches this exact schema:
{
  "collectionId": "string",
  "tags": ["string", "string"],
  "description": "string",
  "title": "string"
}
Do not include any natural language, markdown, comments, or other text.
    `;

    console.log("Gemini Prompt:", prompt);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Asking Gemini for suggestions..." });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      });
      const response = await result.response;
      const text = response.text();
      console.log("Gemini Response:", text);

      const startIndex = text.indexOf("{");
      const endIndex = text.lastIndexOf("}");

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        await showToast({ style: Toast.Style.Failure, title: "AI did not return a valid response" });
        return;
      }

      const jsonString = text.substring(startIndex, endIndex + 1);
      const suggestions = JSON.parse(jsonString) as {
        collectionId: string;
        tags: string[];
        description: string;
        title: string;
      };

      await showToast({ style: Toast.Style.Success, title: "Got suggestions from Gemini!" });

      if (suggestions) {
        if (suggestions.collectionId) {
          const isValidCollectionId = collections.some((c) => c._id.toString() === suggestions.collectionId.toString());
          if (isValidCollectionId) {
            setValue("collection", suggestions.collectionId);
            setDropdownValue(suggestions.collectionId);
          } else {
            console.log("Invalid collectionId from Gemini:", suggestions.collectionId);
            showToast({
              style: Toast.Style.Failure,
              title: "AI returned an invalid collection",
            });
          }
        } else {
          console.log("collectionId missing from Gemini response");
        }

        if (suggestions.title) {
          setValue("title", suggestions.title);
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
      console.error("Error getting suggestions from Gemini:", error);
      await showToast({ style: Toast.Style.Failure, title: "Couldn't get suggestions from Gemini" });
    }
  };

  return { suggestAndApply, newlyCreatedTags };
};
