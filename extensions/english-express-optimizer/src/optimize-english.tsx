import { AI, ActionPanel, Action, Form, useNavigation, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";

const modelGroups = {
  "Large Context (1M+)": [
    {
      value: AI.Model["Google_Gemini_2.5_Pro"],
      title: "Gemini 2.5 Pro",
      description: "1M context window, powerful language understanding",
    },
    {
      value: AI.Model["OpenAI_GPT4.1"],
      title: "GPT-4.1",
      description: "1M context window, advanced language capabilities",
    },
  ],
  "High Performance": [
    { value: AI.Model["OpenAI_GPT4o"], title: "GPT-4o", description: "127k context, most advanced OpenAI model" },
    {
      value: AI.Model["Anthropic_Claude_Sonnet_3.7"],
      title: "Claude 3.7 Sonnet",
      description: "200k context, Anthropic's most intelligent model",
    },
    { value: AI.Model["Anthropic_Claude_Opus"], title: "Claude Opus", description: "200k context, remarkable fluency" },
  ],
  "Fast & Efficient": [
    { value: AI.Model["OpenAI_GPT4o-mini"], title: "GPT-4o Mini", description: "127k context, quick optimization" },
    {
      value: AI.Model["Anthropic_Claude_Sonnet"],
      title: "Claude Sonnet",
      description: "200k context, balanced performance",
    },
    { value: AI.Model["OpenAI_GPT4.1-mini"], title: "GPT-4.1 Mini", description: "1M context, efficient processing" },
  ],
};

export default function Command() {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(AI.Model["OpenAI_GPT4o"]);
  const { push } = useNavigation();

  async function handleSubmit(values: { text: string; model: AI.Model }) {
    try {
      // Show loading toast
      await showToast(Toast.Style.Animated, "Optimizing...", "Please wait while we improve your text");

      const prompt = `Please check the following English text for grammar and word usage, and optimize the expression to be more fluent and natural. Only output the optimized version.\n\n${values.text}`;
      const optimized = await AI.ask(prompt, { model: values.model });

      // Hide loading toast
      await showToast(Toast.Style.Success, "Optimization Complete");

      push(
        <Detail
          markdown={`**Optimized:**\n\n${optimized}\n\n=================================\n\n**Original:**\n\n${values.text}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={optimized} />
            </ActionPanel>
          }
        />,
      );
    } catch (e) {
      showToast(Toast.Style.Failure, "AI Error", String(e));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Optimize" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="English Text Optimizer"
        placeholder="Please enter the text you want to optimize"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown
        id="model"
        title="AI Model"
        value={selectedModel}
        onChange={(value) => setSelectedModel(value as AI.Model)}
      >
        {Object.entries(modelGroups).map(([group, models]) => (
          <Form.Dropdown.Section key={group} title={group}>
            {models.map((model) => (
              <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
    </Form>
  );
}
