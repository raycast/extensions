import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createProvider } from "./providers";
import { HistoryManager } from "./history";
import AnalysisView from "./analysis-view";
import { STYLES } from "./styles";
import { Clipboard } from "@raycast/api";

interface Preferences {
  checkStyle: string;
  autoUseClipboard: boolean;
}

interface CheckGrammarProps {
  initialText?: string;
}

export default function CheckGrammar({ initialText = "" }: CheckGrammarProps) {
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [style, setStyle] = useState(preferences.checkStyle);

  useEffect(() => {
    async function checkClipboard() {
      if (preferences.autoUseClipboard && !initialText) {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          setText(clipboardText);
        }
      }
    }
    checkClipboard();
  }, [initialText]);

  async function handleSubmit(values: { text: string; style: string }) {
    if (!values.text.trim()) {
      showToast(Toast.Style.Failure, "Please enter some text");
      return;
    }

    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Checking grammar...");

    try {
      const provider = createProvider();
      const result = await provider.analyzeText(values.text, values.style);

      await HistoryManager.saveCheck(
        values.text,
        result.corrected,
        result.issues,
      );

      toast.style = Toast.Style.Success;
      toast.title = "Analysis Complete";

      push(<AnalysisView result={result} originalText={values.text} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to check grammar";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Check Grammar"
            onSubmit={handleSubmit}
            icon={Icon.Checkmark}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text to Check"
        placeholder="Type or paste your text here..."
        value={text}
        onChange={setText}
      />
      <Form.Dropdown id="style" title="Style" value={style} onChange={setStyle}>
        {Object.keys(STYLES).map((key) => (
          <Form.Dropdown.Item
            key={key}
            value={key}
            title={key.charAt(0).toUpperCase() + key.slice(1)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
