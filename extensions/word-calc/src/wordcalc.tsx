import {
  ActionPanel,
  Action,
  Clipboard,
  Detail,
  Form,
  List,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "@raycast/utils";
import { StaticAnalysis, analyzeTextStatic, calculateTimeEstimates } from "./utils";

interface Preferences {
  readingSpeed: string;
  speakingSpeed: string;
}

interface WordAnalysis {
  wordCount: number;
  characterCount: number;
  characterCountNoSpaces: number;
  paragraphCount: number;
  readingTime: string;
  speakingTime: string;
  clipboardText: string;
}

// Helper function for reading clipboard with error handling
async function readClipboardText(): Promise<string | null> {
  try {
    const text = await Clipboard.readText();
    return text && text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState<string>("");
  const [customReadingSpeed, setCustomReadingSpeed] = useState<string>("");
  const [customSpeakingSpeed, setCustomSpeakingSpeed] = useState<string>("");

  // Memoize static analysis - only recalculates when text changes
  const staticAnalysis = useMemo(() => {
    return currentText ? analyzeTextStatic(currentText) : null;
  }, [currentText]);

  // Memoize time calculations - only recalculates when speeds or static analysis changes
  const timeEstimates = useMemo(() => {
    if (!staticAnalysis || !customReadingSpeed || !customSpeakingSpeed) {
      return null;
    }

    const readingSpeed = parseInt(customReadingSpeed) || 200;
    const speakingSpeed = parseInt(customSpeakingSpeed) || 150;
    return calculateTimeEstimates(staticAnalysis, readingSpeed, speakingSpeed);
  }, [staticAnalysis, customReadingSpeed, customSpeakingSpeed]);

  // Combine static analysis and time estimates into final analysis
  const analysis = useMemo(() => {
    if (!staticAnalysis || !timeEstimates) {
      return null;
    }

    return {
      wordCount: staticAnalysis.wordCount,
      characterCount: staticAnalysis.characterCount,
      characterCountNoSpaces: staticAnalysis.characterCountNoSpaces,
      paragraphCount: staticAnalysis.paragraphCount,
      readingTime: timeEstimates.readingTime,
      speakingTime: timeEstimates.speakingTime,
      clipboardText: currentText,
    };
  }, [staticAnalysis, timeEstimates, currentText]);

  // Callback for handling clipboard analysis
  const analyzeClipboard = useCallback(async () => {
    try {
      const clipboardText = await readClipboardText();

      if (!clipboardText) {
        setError("No text found in clipboard");
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "No clipboard text",
          message: "Copy some text first, then run this command",
        });
        return;
      }

      // Get user preferences
      const preferences = getPreferenceValues<Preferences>();
      const readingSpeed = parseInt(preferences.readingSpeed) || 200;
      const speakingSpeed = parseInt(preferences.speakingSpeed) || 150;

      setCustomReadingSpeed(readingSpeed.toString());
      setCustomSpeakingSpeed(speakingSpeed.toString());
      setCurrentText(clipboardText);
      setIsLoading(false);

      // Calculate word count for toast (from memoized static analysis)
      const tempStaticAnalysis = analyzeTextStatic(clipboardText);
      await showToast({
        style: Toast.Style.Success,
        title: "Analysis complete",
        message: `${tempStaticAnalysis.wordCount} words analyzed`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Analysis failed",
        message: errorMessage,
      });
    }
  }, []);

  // Initial clipboard analysis
  useEffect(() => {
    analyzeClipboard();
  }, [analyzeClipboard]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="🔄 Analyzing clipboard text..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\n## Instructions\n1. Copy some text to your clipboard\n2. Run this command again`}
        actions={
          <ActionPanel>
            <Action
              title="Analyze Clipboard Again"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                const clipboardText = await readClipboardText();
                if (clipboardText) {
                  setCurrentText(clipboardText);
                  setError(null);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Updated analysis",
                    message: "Analyzed new clipboard content",
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No clipboard text",
                    message: "Copy some text first",
                  });
                }
              }}
            />
            <AnalyzeCustomTextAction
              onAnalyze={(text) => {
                setCurrentText(text);
                setError(null);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!analysis) {
    return <Detail markdown="# ❌ No analysis available" />;
  }

  return (
    <WordAnalysisListView
      analysis={analysis}
      staticAnalysis={staticAnalysis}
      customReadingSpeed={customReadingSpeed}
      customSpeakingSpeed={customSpeakingSpeed}
      onReadingSpeedChange={setCustomReadingSpeed}
      onSpeakingSpeedChange={setCustomSpeakingSpeed}
      onAnalyzeNew={(text) => setCurrentText(text)}
    />
  );
}

// Components
function WordAnalysisListView({
  analysis,
  staticAnalysis,
  customReadingSpeed,
  customSpeakingSpeed,
  onReadingSpeedChange,
  onSpeakingSpeedChange,
  onAnalyzeNew,
}: {
  analysis: WordAnalysis;
  staticAnalysis: StaticAnalysis | null;
  customReadingSpeed: string;
  customSpeakingSpeed: string;
  onReadingSpeedChange: (speed: string) => void;
  onSpeakingSpeedChange: (speed: string) => void;
  onAnalyzeNew: (text: string) => void;
}) {
  // Use pre-computed cleaned text from static analysis to avoid re-computation
  const cleanedText = staticAnalysis?.cleanedText || "";

  return (
    <List navigationTitle={`📊 Analysis: ${analysis.wordCount.toLocaleString()} words`}>
      <List.Section title="⏱️ Time Estimates" subtitle="Reading and speaking duration">
        <List.Item
          title="Reading Time"
          subtitle={`${customReadingSpeed} words per minute`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          accessories={[{ tag: analysis.readingTime, icon: Icon.Eye }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Stats">
                <Action
                  title="Copy Reading Time"
                  icon={Icon.Clock}
                  onAction={async () => {
                    await Clipboard.copy(analysis.readingTime);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied reading time",
                      message: analysis.readingTime,
                    });
                  }}
                />
                <CopyAllStatsAction
                  analysis={analysis}
                  customReadingSpeed={customReadingSpeed}
                  customSpeakingSpeed={customSpeakingSpeed}
                />
              </ActionPanel.Section>
              <CommonActionSections
                onReadingSpeedChange={onReadingSpeedChange}
                onSpeakingSpeedChange={onSpeakingSpeedChange}
                customReadingSpeed={customReadingSpeed}
                customSpeakingSpeed={customSpeakingSpeed}
                cleanedText={cleanedText}
                onAnalyzeNew={onAnalyzeNew}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Speaking Time"
          subtitle={`${customSpeakingSpeed} words per minute`}
          icon={{ source: Icon.Stopwatch, tintColor: Color.Orange }}
          accessories={[{ tag: analysis.speakingTime, icon: Icon.SpeakerHigh }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Stats">
                <Action
                  title="Copy Speaking Time"
                  icon={Icon.SpeakerHigh}
                  onAction={async () => {
                    await Clipboard.copy(analysis.speakingTime);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied speaking time",
                      message: analysis.speakingTime,
                    });
                  }}
                />
                <CopyAllStatsAction
                  analysis={analysis}
                  customReadingSpeed={customReadingSpeed}
                  customSpeakingSpeed={customSpeakingSpeed}
                />
              </ActionPanel.Section>
              <CommonActionSections
                onReadingSpeedChange={onReadingSpeedChange}
                onSpeakingSpeedChange={onSpeakingSpeedChange}
                customReadingSpeed={customReadingSpeed}
                customSpeakingSpeed={customSpeakingSpeed}
                cleanedText={cleanedText}
                onAnalyzeNew={onAnalyzeNew}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📈 Text Statistics" subtitle="Detailed content analysis">
        <List.Item
          title="Word Count"
          subtitle="Total words in text"
          icon={{ source: Icon.Hashtag, tintColor: Color.Purple }}
          accessories={[{ tag: { value: analysis.wordCount.toLocaleString(), color: Color.Purple }, icon: Icon.Text }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Stats">
                <Action
                  title="Copy Word Count"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(analysis.wordCount.toString());
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied word count",
                      message: `${analysis.wordCount} words`,
                    });
                  }}
                />
                <CopyAllStatsAction
                  analysis={analysis}
                  customReadingSpeed={customReadingSpeed}
                  customSpeakingSpeed={customSpeakingSpeed}
                />
              </ActionPanel.Section>
              <CommonActionSections
                onReadingSpeedChange={onReadingSpeedChange}
                onSpeakingSpeedChange={onSpeakingSpeedChange}
                customReadingSpeed={customReadingSpeed}
                customSpeakingSpeed={customSpeakingSpeed}
                cleanedText={cleanedText}
                onAnalyzeNew={onAnalyzeNew}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Character Count"
          subtitle="Total characters including spaces"
          icon={{ source: Icon.TextCursor, tintColor: Color.Green }}
          accessories={[{ tag: analysis.characterCount.toLocaleString(), icon: Icon.Text }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Stats">
                <Action
                  title="Copy Character Count"
                  icon={Icon.TextCursor}
                  onAction={async () => {
                    await Clipboard.copy(analysis.characterCount.toString());
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied character count",
                      message: `${analysis.characterCount.toLocaleString()} characters`,
                    });
                  }}
                />
                <CopyAllStatsAction
                  analysis={analysis}
                  customReadingSpeed={customReadingSpeed}
                  customSpeakingSpeed={customSpeakingSpeed}
                />
              </ActionPanel.Section>
              <CommonActionSections
                onReadingSpeedChange={onReadingSpeedChange}
                onSpeakingSpeedChange={onSpeakingSpeedChange}
                customReadingSpeed={customReadingSpeed}
                customSpeakingSpeed={customSpeakingSpeed}
                cleanedText={cleanedText}
                onAnalyzeNew={onAnalyzeNew}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Characters (No Spaces)"
          subtitle="Characters excluding whitespace"
          icon={{ source: Icon.TextSelection, tintColor: Color.Yellow }}
          accessories={[{ tag: analysis.characterCountNoSpaces.toLocaleString(), icon: Icon.Minus }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Stats">
                <Action
                  title="Copy Character Count (No Spaces)"
                  icon={Icon.TextCursor}
                  onAction={async () => {
                    await Clipboard.copy(analysis.characterCountNoSpaces.toString());
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied character count",
                      message: `${analysis.characterCountNoSpaces.toLocaleString()} characters (no spaces)`,
                    });
                  }}
                />
                <CopyAllStatsAction
                  analysis={analysis}
                  customReadingSpeed={customReadingSpeed}
                  customSpeakingSpeed={customSpeakingSpeed}
                />
              </ActionPanel.Section>
              <CommonActionSections
                onReadingSpeedChange={onReadingSpeedChange}
                onSpeakingSpeedChange={onSpeakingSpeedChange}
                customReadingSpeed={customReadingSpeed}
                customSpeakingSpeed={customSpeakingSpeed}
                cleanedText={cleanedText}
                onAnalyzeNew={onAnalyzeNew}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Paragraph Count"
          subtitle="Number of paragraphs"
          icon={{ source: Icon.Document, tintColor: Color.Red }}
          accessories={[{ tag: { value: analysis.paragraphCount.toString(), color: Color.Red }, icon: Icon.Paragraph }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Stats">
                <Action
                  title="Copy Paragraph Count"
                  icon={Icon.Paragraph}
                  onAction={async () => {
                    await Clipboard.copy(analysis.paragraphCount.toString());
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied paragraph count",
                      message: `${analysis.paragraphCount} paragraphs`,
                    });
                  }}
                />
                <CopyAllStatsAction
                  analysis={analysis}
                  customReadingSpeed={customReadingSpeed}
                  customSpeakingSpeed={customSpeakingSpeed}
                />
              </ActionPanel.Section>
              <CommonActionSections
                onReadingSpeedChange={onReadingSpeedChange}
                onSpeakingSpeedChange={onSpeakingSpeedChange}
                customReadingSpeed={customReadingSpeed}
                customSpeakingSpeed={customSpeakingSpeed}
                cleanedText={cleanedText}
                onAnalyzeNew={onAnalyzeNew}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Helper component for common action sections
function CommonActionSections({
  onReadingSpeedChange,
  onSpeakingSpeedChange,
  customReadingSpeed,
  customSpeakingSpeed,
  cleanedText,
  onAnalyzeNew,
}: {
  onReadingSpeedChange: (speed: string) => void;
  onSpeakingSpeedChange: (speed: string) => void;
  customReadingSpeed: string;
  customSpeakingSpeed: string;
  cleanedText: string;
  onAnalyzeNew: (text: string) => void;
}) {
  return (
    <>
      <ActionPanel.Section title="Adjust Settings">
        <AdjustSpeedsAction
          currentReadingSpeed={customReadingSpeed}
          currentSpeakingSpeed={customSpeakingSpeed}
          onSpeedsChange={(reading, speaking) => {
            onReadingSpeedChange(reading);
            onSpeakingSpeedChange(speaking);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="View Details">
        <Action
          title="Show Cleaned Text"
          icon={Icon.Eye}
          onAction={async () => {
            const cleanedPreviewText = cleanedText.length > 300 ? cleanedText.substring(0, 300) + "..." : cleanedText;
            await showToast({
              style: Toast.Style.Success,
              title: "Cleaned text for word counting",
              message: cleanedPreviewText,
            });
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Analyze New Text">
        <AnalyzeCustomTextAction onAnalyze={onAnalyzeNew} />
        <Action
          title="Analyze Clipboard Again"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            const clipboardText = await readClipboardText();
            if (clipboardText) {
              onAnalyzeNew(clipboardText);
              await showToast({
                style: Toast.Style.Success,
                title: "Updated analysis",
                message: "Analyzed new clipboard content",
              });
            } else {
              await showToast({
                style: Toast.Style.Failure,
                title: "No clipboard text",
                message: "Copy some text first",
              });
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
}

// Helper component for copy all stats action
function CopyAllStatsAction({
  analysis,
  customReadingSpeed,
  customSpeakingSpeed,
}: {
  analysis: WordAnalysis;
  customReadingSpeed: string;
  customSpeakingSpeed: string;
}) {
  return (
    <Action
      title="Copy All Stats"
      icon={Icon.CopyClipboard}
      onAction={async () => {
        const stats = `${analysis.wordCount.toLocaleString()} words • Reading: ${analysis.readingTime} (${customReadingSpeed} WPM) • Speaking: ${analysis.speakingTime} (${customSpeakingSpeed} WPM) • ${analysis.characterCount.toLocaleString()} chars • ${analysis.paragraphCount} paragraphs`;
        await Clipboard.copy(stats);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied all stats",
          message: "Analysis copied to clipboard",
        });
      }}
    />
  );
}

function AdjustSpeedsAction({
  currentReadingSpeed,
  currentSpeakingSpeed,
  onSpeedsChange,
}: {
  currentReadingSpeed: string;
  currentSpeakingSpeed: string;
  onSpeedsChange: (reading: string, speaking: string) => void;
}) {
  const { push } = useNavigation();

  return (
    <Action
      title="Adjust Speeds"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd"], key: "," }}
      onAction={() =>
        push(
          <SpeedAdjustmentForm
            initialReadingSpeed={currentReadingSpeed}
            initialSpeakingSpeed={currentSpeakingSpeed}
            onSubmit={onSpeedsChange}
          />,
        )
      }
    />
  );
}

function SpeedAdjustmentForm({
  initialReadingSpeed,
  initialSpeakingSpeed,
  onSubmit,
}: {
  initialReadingSpeed: string;
  initialSpeakingSpeed: string;
  onSubmit: (reading: string, speaking: string) => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{
    readingSpeed: string;
    speakingSpeed: string;
  }>({
    onSubmit(values) {
      onSubmit(values.readingSpeed, values.speakingSpeed);
      pop();
      showToast({
        style: Toast.Style.Success,
        title: "Speeds updated",
        message: `Reading: ${values.readingSpeed} WPM, Speaking: ${values.speakingSpeed} WPM`,
      });
    },
    initialValues: {
      readingSpeed: initialReadingSpeed,
      speakingSpeed: initialSpeakingSpeed,
    },
    validation: {
      readingSpeed: (value) => {
        if (!value || value.trim() === "") {
          return "Reading speed is required";
        }
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue <= 0) {
          return "Reading speed must be a positive number";
        }
        if (numValue < 50 || numValue > 1000) {
          return "Reading speed should be between 50-1000 WPM";
        }
      },
      speakingSpeed: (value) => {
        if (!value || value.trim() === "") {
          return "Speaking speed is required";
        }
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue <= 0) {
          return "Speaking speed must be a positive number";
        }
        if (numValue < 30 || numValue > 500) {
          return "Speaking speed should be between 30-500 WPM";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Speeds" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Adjust reading and speaking speeds to recalculate time estimates in real-time." />
      <Form.TextField
        title="Reading Speed (WPM)"
        placeholder="200"
        info="Average reading speed is 200-250 words per minute"
        {...itemProps.readingSpeed}
      />
      <Form.TextField
        title="Speaking Speed (WPM)"
        placeholder="150"
        info="Average speaking speed is 130-150 words per minute"
        {...itemProps.speakingSpeed}
      />
      <Form.Separator />
      <Form.Description text="💡 Tip: Changes will be applied immediately and affect the time calculations." />
    </Form>
  );
}

function AnalyzeCustomTextAction({ onAnalyze }: { onAnalyze: (text: string) => void }) {
  const { push } = useNavigation();

  return (
    <Action
      title="Analyze Custom Text"
      icon={Icon.TextInput}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<CustomTextForm onSubmit={onAnalyze} />)}
    />
  );
}

function CustomTextForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{
    customText: string;
  }>({
    onSubmit(values) {
      // Use the optimized static analysis for word count
      const tempStaticAnalysis = analyzeTextStatic(values.customText);
      onSubmit(values.customText);
      pop();
      showToast({
        style: Toast.Style.Success,
        title: "Analyzing custom text",
        message: `${tempStaticAnalysis.wordCount} words found`,
      });
    },
    validation: {
      customText: (value) => {
        if (!value || value.trim() === "") {
          return "Text is required for analysis";
        }
        if (value.trim().length < 3) {
          return "Please enter at least 3 characters";
        }
        // Optional: Check for maximum length to prevent performance issues
        if (value.length > 100000) {
          return "Text is too long (maximum 100,000 characters)";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Analyze Text" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter any text you'd like to analyze for word count and timing estimates. HTML tags and Markdown formatting will be stripped for accurate word counting." />
      <Form.TextArea
        title="Text to Analyze"
        placeholder="Paste or type your text here..."
        info="HTML, Markdown, and other markup will be automatically removed for accurate word counting"
        {...itemProps.customText}
      />
    </Form>
  );
}
