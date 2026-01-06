import {
  Detail,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  Icon,
  popToRoot,
} from "@raycast/api";
import { addToHistory } from "./history";

interface CompareViewProps {
  originalPrompt: string;
  enhancedPrompt: string;
  provider: string;
  model: string;
  style: string;
}

export default function CompareView(props: CompareViewProps) {
  const { originalPrompt, enhancedPrompt, provider, model, style } = props;

  async function handleCopyEnhanced() {
    // Save to history
    await addToHistory({
      originalPrompt,
      enhancedPrompt,
      provider,
      model,
      style,
    });

    await Clipboard.copy(enhancedPrompt);

    await showToast({
      style: Toast.Style.Success,
      title: "Copied enhanced prompt!",
    });

    await popToRoot();
  }

  async function handleCopyOriginal() {
    await Clipboard.copy(originalPrompt);

    await showToast({
      style: Toast.Style.Success,
      title: "Copied original prompt",
    });
  }

  async function handlePasteEnhanced() {
    // Save to history
    await addToHistory({
      originalPrompt,
      enhancedPrompt,
      provider,
      model,
      style,
    });

    await Clipboard.paste(enhancedPrompt);

    await popToRoot();
  }

  const markdown = `# Enhanced Prompt

${enhancedPrompt}

---

## Original Prompt

${originalPrompt}

---

**Provider:** ${provider} | **Model:** ${model} | **Style:** ${style}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Copy Enhanced Prompt"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={handleCopyEnhanced}
            />
            <Action
              title="Paste Enhanced Prompt"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={handlePasteEnhanced}
            />
            <Action
              title="Copy Original Prompt"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={handleCopyOriginal}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Edit and Retry"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditRetryView originalPrompt={originalPrompt} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

import { useState } from "react";
import { Form, useNavigation } from "@raycast/api";
import { enhancePrompt } from "./api";

function EditRetryView({ originalPrompt }: { originalPrompt: string }) {
  const [prompt, setPrompt] = useState(originalPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function handleRetry() {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Enhancing prompt...",
      });

      const result = await enhancePrompt(prompt.trim());

      push(
        <CompareView
          originalPrompt={prompt.trim()}
          enhancedPrompt={result.enhancedPrompt}
          provider={result.provider}
          model={result.model}
          style={result.style}
        />,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Enhancement failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Enhance Again"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleRetry}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Edit Prompt"
        value={prompt}
        onChange={setPrompt}
        autoFocus
      />
    </Form>
  );
}
