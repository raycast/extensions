import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { CreatePromptForm } from "./components";
import { getSelectedTextContent } from "./utils";
import { nanoid } from "nanoid";
import { useLocalStorage, showFailureToast } from "@raycast/utils";
import { Prompt, PromptFormValues } from "./types";

export default function Command() {
  const [selectedContent, setSelectedContent] = useState("");
  const { value: prompts, setValue: setPrompts, isLoading } = useLocalStorage<Prompt[]>("prompts");

  const handleCreate = (values: PromptFormValues) => {
    setPrompts([
      ...(prompts ?? []),
      {
        id: nanoid(),
        title: values.title,
        content: values.content,
        tags: values.tags.split(",").filter((tag) => tag.trim() !== ""),
        enabled: values.enabled,
      },
    ]);
    showToast({
      style: Toast.Style.Success,
      title: "Prompt created",
      message: "Prompt created successfully",
    });
  };

  const handleSelectedText = async () => {
    try {
      const selectedText = await getSelectedTextContent();

      if (selectedText) {
        setSelectedContent(selectedText);
      } else {
        setSelectedContent("");
      }
    } catch (error) {
      showFailureToast(error, { title: "No text selected" });
    }
  };

  useEffect(() => {
    handleSelectedText();
  }, []);

  return <CreatePromptForm onCreate={handleCreate} selectedText={selectedContent} isLoading={isLoading} />;
}
