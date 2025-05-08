import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { CreatePromptForm } from "./components";
import { getSelectedTextContent } from "./utils";
import { nanoid } from "nanoid";
import { useLocalStorage } from "@raycast/utils";
import { Prompt } from "./types";

export default function Command() {
  const [selectedContent, setSelectedContent] = useState("");
  const { value: prompts, setValue: setPrompts, isLoading } = useLocalStorage<Prompt[]>("prompts");

  const handleCreate = (values: { title: string; content: string; tags: string; enabled: boolean }) => {
    setPrompts([
      ...(prompts ?? []),
      {
        id: nanoid(),
        title: values.title,
        content: values.content,
        tags: values.tags.split(","),
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
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: String(error),
      });
    }
  };

  useEffect(() => {
    handleSelectedText();
  }, []);

  return <CreatePromptForm onCreate={handleCreate} selectedText={selectedContent} isLoading={isLoading} />;
}
