import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Detail,
  useNavigation,
  showToast,
  Toast,
  Clipboard,
  AI,
  environment,
} from "@raycast/api";
import { useState } from "react";
import { Recipe, CREATIVITY_OPTIONS } from "../types";
import { addUsageRecord } from "../lib/storage";

// Fixed model: OpenAI GPT-4o
const FIXED_MODEL = AI.Model.OpenAI_GPT4o;

interface UseRecipeViewProps {
  recipe: Recipe;
  onComplete?: () => void;
}

export function UseRecipeView({ recipe, onComplete }: UseRecipeViewProps) {
  const [input, setInput] = useState("");
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { pop } = useNavigation();

  const handleGenerate = async () => {
    if (!input.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter content" });
      return;
    }

    if (!environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast Pro Required",
        message: "AI features require a Raycast Pro subscription",
      });
      return;
    }

    setIsGenerating(true);
    setOutput(null);

    const generatingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating...",
    });

    try {
      let fullPrompt = recipe.systemPrompt;
      if (additionalPrompt.trim()) {
        fullPrompt += `\n\nAdditional requirements: ${additionalPrompt.trim()}`;
      }
      fullPrompt += `\n\nUser input:\n${input}`;

      const response = await AI.ask(fullPrompt, {
        model: FIXED_MODEL,
        creativity: recipe.creativity,
      });

      setOutput(response);

      await addUsageRecord({
        recipeId: recipe.id,
        input,
        output: response,
        additionalPrompt: additionalPrompt.trim() || undefined,
        model: FIXED_MODEL,
      });

      onComplete?.();

      generatingToast.style = Toast.Style.Success;
      generatingToast.title = "Generated";
      generatingToast.message = undefined;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Generation failed";

      generatingToast.style = Toast.Style.Failure;
      generatingToast.title = "Failed";
      generatingToast.message = errorMsg;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (output) {
      await Clipboard.copy(output);
      await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
    }
  };

  const handleReset = () => {
    setInput("");
    setAdditionalPrompt("");
    setOutput(null);
  };

  if (output !== null) {
    return (
      <Detail
        navigationTitle={`${recipe.name} - Result`}
        markdown={`\`\`\`\n${output}\n\`\`\``}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Recipe" text={recipe.name} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Input" text={input.substring(0, 100) + (input.length > 100 ? "..." : "")} />
            {additionalPrompt && (
              <Detail.Metadata.Label
                title="Additional"
                text={additionalPrompt.substring(0, 50) + (additionalPrompt.length > 50 ? "..." : "")}
              />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Copy Result" icon={Icon.CopyClipboard} onAction={handleCopy} />
            <Action title="Regenerate" icon={Icon.ArrowClockwise} onAction={handleGenerate} />
            <Action title="New Input" icon={Icon.Plus} onAction={handleReset} />
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle={recipe.name}
      isLoading={isGenerating}
      actions={
        <ActionPanel>
          <Action title="Generate" icon={Icon.Wand} onAction={handleGenerate} />
          <Action
            title={showPrompt ? "Hide Prompt" : "Show Prompt"}
            icon={showPrompt ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setShowPrompt(!showPrompt)}
          />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title="Recipe" text={recipe.name} />
      {recipe.description && <Form.Description text={recipe.description} />}

      <Form.Separator />

      <Form.TextArea
        id="input"
        title={recipe.inputType ? `Input (${recipe.inputType})` : "Input"}
        placeholder="Enter your content here..."
        value={input}
        onChange={setInput}
        autoFocus
      />

      <Form.TextArea
        id="additionalPrompt"
        title="Additional Requirements"
        placeholder="Optional: Extra requirements for this generation..."
        value={additionalPrompt}
        onChange={setAdditionalPrompt}
        info="Won't modify the core prompt, only applies to this generation"
      />

      {showPrompt && (
        <>
          <Form.Separator />
          <Form.Description title="System Prompt" text={recipe.systemPrompt} />
          <Form.Description
            title="Creativity"
            text={CREATIVITY_OPTIONS.find((c) => c.value === recipe.creativity)?.label || String(recipe.creativity)}
          />
        </>
      )}

      {recipe.outputType && <Form.Description title="Output Type" text={recipe.outputType} />}
    </Form>
  );
}
