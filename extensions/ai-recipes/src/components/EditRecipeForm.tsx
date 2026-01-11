import { Form, ActionPanel, Action, Icon, useNavigation, showToast, Toast, AI } from "@raycast/api";
import { useState, useEffect } from "react";
import { Recipe, Tag, CREATIVITY_OPTIONS } from "../types";
import { createRecipe, updateRecipe, getTags } from "../lib/storage";

// Fixed model: OpenAI GPT-4o
const FIXED_MODEL = AI.Model.OpenAI_GPT4o;

interface EditRecipeFormProps {
  recipe?: Recipe;
  onSave?: () => void;
}

export function EditRecipeForm({ recipe, onSave }: EditRecipeFormProps) {
  const isEditing = !!recipe;
  const { pop } = useNavigation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState(recipe?.name || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(recipe?.systemPrompt || "");
  const [creativity, setCreativity] = useState<string>(recipe?.creativity?.toString() || "medium");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(recipe?.tagIds || []);
  const [inputType, setInputType] = useState(recipe?.inputType || "");
  const [outputType, setOutputType] = useState(recipe?.outputType || "");

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const loadedTags = await getTags();
    setTags(loadedTags);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter recipe name" });
      return;
    }
    if (!systemPrompt.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter system prompt" });
      return;
    }

    try {
      if (isEditing && recipe) {
        await updateRecipe(recipe.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim(),
          defaultModel: FIXED_MODEL,
          creativity: creativity as AI.Creativity,
          tagIds: selectedTagIds,
          inputType: inputType.trim() || undefined,
          outputType: outputType.trim() || undefined,
        });
        await showToast({ style: Toast.Style.Success, title: "Recipe updated" });
      } else {
        await createRecipe({
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim(),
          defaultModel: FIXED_MODEL,
          creativity: creativity as AI.Creativity,
          tagIds: selectedTagIds,
          inputType: inputType.trim() || undefined,
          outputType: outputType.trim() || undefined,
        });
        await showToast({ style: Toast.Style.Success, title: "Recipe created" });
      }

      onSave?.();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      await showToast({ style: Toast.Style.Failure, title: "Save failed", message });
    }
  };

  return (
    <Form
      navigationTitle={isEditing ? `Edit: ${recipe.name}` : "Create New Recipe"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title={isEditing ? "Save" : "Create"} icon={Icon.Check} onAction={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Recipe Name"
        placeholder="e.g., Tweet Generator"
        value={name}
        onChange={setName}
        autoFocus
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Brief description of what this recipe does..."
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="Define the AI's behavior and output format..."
        value={systemPrompt}
        onChange={setSystemPrompt}
        enableMarkdown
        info="This is the core instruction the AI receives, defining how it should process user input"
      />

      <Form.Separator />

      <Form.Dropdown
        id="creativity"
        title="Creativity"
        value={creativity}
        onChange={setCreativity}
        info="Use lower creativity for precise tasks (translation), higher for open-ended tasks (brainstorming)"
      >
        {CREATIVITY_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TagPicker
        id="tags"
        title="Tags"
        value={selectedTagIds}
        onChange={setSelectedTagIds}
        info="Select tags to organize your recipes"
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.TextField
        id="inputType"
        title="Input Type"
        placeholder="e.g., article, idea, code..."
        value={inputType}
        onChange={setInputType}
        info="Optional: Describe what type of input this recipe accepts"
      />

      <Form.TextField
        id="outputType"
        title="Output Type"
        placeholder="e.g., tweet, summary, translation..."
        value={outputType}
        onChange={setOutputType}
        info="Optional: Describe what type of content this recipe outputs"
      />

      {isEditing && recipe.promptVersions.length > 1 && (
        <>
          <Form.Separator />
          <Form.Description
            title="Prompt Versions"
            text={`${recipe.promptVersions.length} versions, latest: ${new Date(recipe.promptVersions[recipe.promptVersions.length - 1].createdAt).toLocaleString()}`}
          />
        </>
      )}
    </Form>
  );
}
