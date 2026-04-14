import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showToast,
  Toast,
  AI,
  environment,
  Icon,
  Detail,
  Color,
} from "@raycast/api";
import { usePromptStore } from "./store/usePromptStore";
import { useState } from "react";

type GenerationStep = "input" | "generating" | "result";

interface GeneratedPrompt {
  title: string;
  content: string;
  tags: string[];
}

export default function Command() {
  const { pop } = useNavigation();
  const addPrompt = usePromptStore((state) => state.addPrompt);
  const [step, setStep] = useState<GenerationStep>("input");
  const [generatedPrompt, setGeneratedPrompt] =
    useState<GeneratedPrompt | null>(null);

  async function handleSubmit(values: { intent: string }) {
    if (!values.intent) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        description: "Please describe what prompt you want to generate",
      });
      return;
    }

    if (!environment.canAccess(AI)) {
      showToast({
        style: Toast.Style.Failure,
        title: "AI Access Error",
        description: "You need Raycast Pro to use this feature",
      });
      return;
    }

    setStep("generating");

    try {
      const prompt = `You are an expert prompt engineer. The user wants a prompt for: "${values.intent}".
      Return a JSON object with the following structure:
      {
        "title": "A short, descriptive title",
        "content": "The full prompt content, using {{variable}} syntax for placeholders if appropriate",
        "tags": ["tag1", "tag2"]
      }
      Return ONLY the JSON. Avoid markdown formatting blocks.`;

      const response = await AI.ask(prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not find a valid JSON response from AI");
      }

      const generated: GeneratedPrompt = JSON.parse(jsonMatch[0]);

      if (!generated.title || !generated.content) {
        throw new Error("AI generated an incomplete prompt");
      }

      addPrompt({
        title: generated.title,
        content: generated.content,
        tags: generated.tags || [],
      });

      setGeneratedPrompt(generated);
      setStep("result");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate prompt",
        description: error instanceof Error ? error.message : String(error),
      });
      setStep("input");
    }
  }

  if (step === "generating") {
    const generatingMarkdown = `
# ✨ Creating Magic...

Raycast AI is analyzing your request to design a professional prompt template.
We are optimizing the context, variables, and tags to make it perfect for you.

*Please wait a moment while we polish the details.*
    `;
    return <Detail isLoading={true} markdown={generatingMarkdown} />;
  }

  if (step === "result" && generatedPrompt) {
    const resultMarkdown = `
# ✅ Prompt Ready to Use

Click **Copy Content** or press **Enter** to take it to your clipboard. 
You can exit this view by pressing **Esc** or **Backspace**.

---

### Generated Template:

\`\`\`text
${generatedPrompt.content}
\`\`\`
    `;

    return (
      <Detail
        markdown={resultMarkdown}
        navigationTitle="AI Result"
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Title"
              text={generatedPrompt.title}
              icon={Icon.Text}
            />
            <Detail.Metadata.TagList title="Tags">
              {generatedPrompt.tags?.map((tag) => (
                <Detail.Metadata.TagList.Item
                  key={tag}
                  text={tag}
                  color={Color.Blue}
                />
              )) || <Detail.Metadata.TagList.Item text="No tags" />}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Status"
              text="Saved to Library"
              icon={{ source: Icon.CheckCircle, color: Color.Green }}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Content"
              content={generatedPrompt.content}
            />
            <Action
              title="Generate Another"
              icon={Icon.Plus}
              onAction={() => setStep("input")}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action title="Close" icon={Icon.XMarkCircle} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate with AI"
            icon={Icon.MagicWand}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Describe the purpose of your prompt. Raycast AI will design an optimized template with automatic variables and tags." />
      <Form.TextArea
        id="intent"
        title="Prompt Intent"
        placeholder="e.g. I need a prompt to analyze Node.js error logs and suggest solutions based on StackOverflow."
        info="The more descriptive you are, the better the AI result will be."
      />
    </Form>
  );
}
