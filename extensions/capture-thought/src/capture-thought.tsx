import React, { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getSelectedText,
  Clipboard,
  popToRoot,
  showHUD,
  List,
  Icon,
} from "@raycast/api";
import { draftThought, createThought } from "./api";
import { ThoughtType, Priority, Category, AIClassification } from "./types";

interface FormValues {
  inputText: string;
  title: string;
  description: string;
  type: ThoughtType;
  priority: Priority;
  category: Category;
  dueDate?: Date;
}

interface DetectedInput {
  type: "selection" | "clipboard-text" | "clipboard-image";
  content: string;
  preview: string;
}

export default function CaptureThought() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classification, setClassification] = useState<AIClassification | null>(
    null,
  );
  const [inputSource, setInputSource] = useState<
    "selection" | "clipboard" | "dictation" | null
  >(null);
  const [showingInputChoice, setShowingInputChoice] = useState(false);
  const [detectedInputs, setDetectedInputs] = useState<DetectedInput[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({
    inputText: "",
    title: "",
    description: "",
    type: "Task" as ThoughtType,
    priority: "Medium" as Priority,
    category: "Work" as Category,
  });

  useEffect(() => {
    async function initializeCapture() {
      try {
        setIsLoading(true);

        const availableInputs: DetectedInput[] = [];

        // Check for selected text
        try {
          const selectedText = await getSelectedText();
          if (selectedText.trim()) {
            availableInputs.push({
              type: "selection",
              content: selectedText,
              preview:
                selectedText.slice(0, 100) +
                (selectedText.length > 100 ? "..." : ""),
            });
          }
        } catch {
          // No selection available
        }

        // Check for clipboard content
        let clipboardHasText = false;
        try {
          const clipboardText = await Clipboard.readText();
          // Ignore clipboard text if it matches 'Image (###x###)' or 'Image (###×###)' or similar
          const imagePattern = /^Image \(\d{2,5}\s*[x×]\s*\d{2,5}\)$/i;
          if (
            clipboardText &&
            clipboardText.trim() &&
            !imagePattern.test(clipboardText.trim())
          ) {
            clipboardHasText = true;
            // Only add if different from selection
            const isDifferentFromSelection = !availableInputs.some(
              (input) =>
                input.type === "selection" && input.content === clipboardText,
            );

            if (isDifferentFromSelection) {
              availableInputs.push({
                type: "clipboard-text",
                content: clipboardText,
                preview:
                  clipboardText.slice(0, 100) +
                  (clipboardText.length > 100 ? "..." : ""),
              });
            }
          }
        } catch {
          // No clipboard text available
        }

        // Check for clipboard image (ignore if no text is present)
        if (!clipboardHasText) {
          try {
            // Clipboard.read() returns { file?: string, text?: string }
            const clipboardContent = await Clipboard.read();
            if (
              clipboardContent.file &&
              clipboardContent.file.startsWith("data:image/")
            ) {
              // Image detected, but we do NOT support images yet, so skip adding as input
              // Optionally, show a toast to inform the user
              showToast({
                style: Toast.Style.Animated,
                title: "Clipboard contains an image",
                message:
                  "Image input is not supported yet. Please copy text or select text to capture.",
              });
            }
          } catch {
            // No clipboard image available
          }
        }

        setDetectedInputs(availableInputs);

        if (availableInputs.length === 0) {
          // No inputs detected - go straight to manual input
          setInputSource("dictation");
          showToast({
            style: Toast.Style.Success,
            title: "Ready for input",
            message: "Type or dictate your thought below",
          });
        } else if (availableInputs.length === 1) {
          // Only one input detected - use it directly
          const input = availableInputs[0];
          setFormValues((prev) => ({
            ...prev,
            inputText: input.content,
          }));
          setInputSource(
            input.type === "selection" ? "selection" : "clipboard",
          );

          showToast({
            style: Toast.Style.Success,
            title: `Using ${input.type.replace("-", " ")}`,
            message: "You can edit before analyzing",
          });
        } else {
          // Multiple inputs detected - show choice
          setShowingInputChoice(true);
          showToast({
            style: Toast.Style.Success,
            title: "Multiple inputs detected",
            message: "Choose what to use or start fresh",
          });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setInputSource("dictation");
      } finally {
        setIsLoading(false);
      }
    }

    initializeCapture();
  }, []);

  function handleInputChoice(input: DetectedInput | "fresh") {
    setShowingInputChoice(false);

    if (input === "fresh") {
      setInputSource("dictation");
      setFormValues((prev) => ({ ...prev, inputText: "" }));
      showToast({
        style: Toast.Style.Success,
        title: "Starting fresh",
        message: "Type or dictate your thought",
      });
    } else {
      setFormValues((prev) => ({
        ...prev,
        inputText: input.content,
      }));
      setInputSource(input.type === "selection" ? "selection" : "clipboard");

      showToast({
        style: Toast.Style.Success,
        title: `Using ${input.type.replace("-", " ")}`,
        message: "You can edit before analyzing",
      });
    }
  }

  async function handleAnalyze() {
    if (!formValues.inputText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No text to analyze",
        message: "Please enter or dictate your thought first",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Analyzing thought...",
      });

      // Get AI classification
      const aiClassification = await draftThought({
        text: formValues.inputText,
        context: "dictation",
      });
      setClassification(aiClassification);

      // Pre-fill form with AI suggestions
      setFormValues((prev: FormValues) => ({
        ...prev,
        title: aiClassification.title,
        description: aiClassification.description,
        type: aiClassification.type,
        priority: aiClassification.priority,
        category: aiClassification.category,
        dueDate: aiClassification.dueDate
          ? new Date(aiClassification.dueDate)
          : undefined,
      }));

      showToast({
        style: Toast.Style.Success,
        title: "Thought analyzed",
        message: "Review and edit before saving",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to analyze thought",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Saving thought...",
      });

      await createThought({
        title: values.title,
        description: values.description,
        type: values.type,
        priority: values.priority,
        category: values.category,
        dueDate: values.dueDate?.toISOString(),
        rawInput: {
          text: formValues.inputText,
          source: inputSource || "manual",
          timestamp: new Date().toISOString(),
        },
      });

      showHUD("💭 Thought captured successfully!");
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save thought",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const thoughtTypes: ThoughtType[] = [
    "Task",
    "Idea",
    "Concern",
    "Decision",
    "Question",
    "Note",
  ];
  const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];
  const categories: Category[] = ["Work", "Personal"];

  // Show input choice screen
  if (showingInputChoice) {
    return (
      <List>
        <List.Section title="Choose Input Source">
          {detectedInputs.map((input, index) => {
            const hotkey =
              input.type === "selection"
                ? "⌘1"
                : input.type === "clipboard-text"
                  ? "⌘2"
                  : "⌘3";
            return (
              <List.Item
                key={index}
                icon={
                  input.type === "selection"
                    ? Icon.Text
                    : input.type === "clipboard-text"
                      ? Icon.Clipboard
                      : Icon.Image
                }
                title={
                  input.type === "selection"
                    ? "Selected Text"
                    : input.type === "clipboard-text"
                      ? "Clipboard Text"
                      : "Clipboard Image"
                }
                subtitle={input.preview}
                accessories={[{ text: hotkey, tooltip: `Hotkey: ${hotkey}` }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Use This Input"
                      onAction={() => handleInputChoice(input)}
                      shortcut={{
                        modifiers: ["cmd"],
                        key:
                          input.type === "selection"
                            ? "1"
                            : input.type === "clipboard-text"
                              ? "2"
                              : "3",
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
          <List.Item
            icon={Icon.Plus}
            title="Start Fresh"
            subtitle="Type or dictate new content"
            accessories={[{ text: "⌘0", tooltip: "Hotkey: ⌘0" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Start Fresh"
                  onAction={() => handleInputChoice("fresh")}
                  shortcut={{ modifiers: ["cmd"], key: "0" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  // Show loading screen
  if (isLoading) {
    return (
      <Form isLoading={true}>
        <Form.Description text="Detecting available inputs..." />
      </Form>
    );
  }

  // Manual input mode (no classification yet)
  if (!classification) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Analyze with AI"
              onAction={handleAnalyze}
              icon="🤖"
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="inputText"
          title="Your Thought"
          placeholder="Type or dictate your thought here..."
          value={formValues.inputText}
          onChange={(value: string) =>
            setFormValues({ ...formValues, inputText: value })
          }
          info={
            inputSource === "dictation"
              ? "Tip: You can use voice dictation or your SuperWhisper hotkey to speak directly into this field"
              : `Text from ${inputSource} - you can edit or replace it`
          }
        />

        {isAnalyzing && (
          <Form.Description text="🤖 Analyzing your thought with AI..." />
        )}
      </Form>
    );
  }

  // Classification complete - show full form
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Thought" onSubmit={handleSubmit} />
          <Action
            title="Re-analyze"
            onAction={() => {
              setClassification(null);
              handleAnalyze();
            }}
            icon="🤖"
          />
        </ActionPanel>
      }
    >
      {inputSource === "dictation" && (
        <>
          <Form.TextArea
            id="inputText"
            title="Original Text"
            value={formValues.inputText}
            onChange={(value: string) =>
              setFormValues({ ...formValues, inputText: value })
            }
          />
          <Form.Separator />
        </>
      )}

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a concise title for your thought"
        value={formValues.title}
        onChange={(value: string) =>
          setFormValues({ ...formValues, title: value })
        }
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Detailed description or notes"
        value={formValues.description}
        onChange={(value: string) =>
          setFormValues({ ...formValues, description: value })
        }
      />

      <Form.Dropdown
        id="type"
        title="Type"
        value={formValues.type}
        onChange={(value: string) =>
          setFormValues({ ...formValues, type: value as ThoughtType })
        }
      >
        {thoughtTypes.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={formValues.priority}
        onChange={(value: string) =>
          setFormValues({ ...formValues, priority: value as Priority })
        }
      >
        {priorities.map((priority) => (
          <Form.Dropdown.Item
            key={priority}
            value={priority}
            title={priority}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="category"
        title="Category"
        value={formValues.category}
        onChange={(value: string) =>
          setFormValues({ ...formValues, category: value as Category })
        }
      >
        {categories.map((category) => (
          <Form.Dropdown.Item
            key={category}
            value={category}
            title={category}
          />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="dueDate"
        title="Due Date (Optional)"
        value={formValues.dueDate}
        onChange={(value: Date | null) =>
          setFormValues({ ...formValues, dueDate: value || undefined })
        }
      />

      <Form.Description
        text={`AI suggested: ${classification.type} with ${classification.priority} priority${inputSource !== "dictation" ? ` (from ${inputSource})` : ""}`}
      />
    </Form>
  );
}
