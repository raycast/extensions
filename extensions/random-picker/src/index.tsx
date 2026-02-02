import { Form, ActionPanel, Action, useNavigation, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";

interface OptionField {
  id: string;
  value: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [options, setOptions] = useState<OptionField[]>([
    { id: "1", value: "" },
    { id: "2", value: "" },
  ]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [focusedOptionId, setFocusedOptionId] = useState<string | null>(null);

  async function handleSubmit() {
    // Filter out empty options
    const validOptions = options.map((opt) => opt.value.trim()).filter((val) => val.length > 0);

    // Validation: at least 2 options required
    if (validOptions.length < 2) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter at least 2 options.",
      });
      return;
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * validOptions.length);
    const selectedOption = validOptions[randomIndex];

    const toast = await showToast({
      style: Toast.Style.Success,
      title: "Rolled!",
    });
    setTimeout(() => toast.hide(), 1000);

    // Navigate to result view
    push(<ResultView selectedOption={selectedOption} allOptions={validOptions} />);
  }

  function handleOptionChange(id: string, value: string) {
    setOptions((prev) => {
      const newOptions = prev.map((opt) => (opt.id === id ? { ...opt, value } : opt));

      // If we are typing in the last field and it's not empty anymore, add a new empty field
      const lastOption = newOptions[newOptions.length - 1];
      if (lastOption.id === id && value.trim().length > 0) {
        const newId = (Math.max(...newOptions.map((o) => parseInt(o.id))) + 1).toString();
        return [...newOptions, { id: newId, value: "" }];
      }

      return newOptions;
    });
  }

  function addNewOption() {
    const newId = (Math.max(...options.map((o) => parseInt(o.id))) + 1).toString();
    setOptions((prev) => [...prev, { id: newId, value: "" }]);
    setLastAddedId(newId);
  }

  function removeOption(id: string) {
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pick Random Option" onSubmit={handleSubmit} />
          <Action title="Add New Option" onAction={addNewOption} shortcut={{ modifiers: ["cmd"], key: "n" }} />
          {focusedOptionId && options.length > 2 && (
            <Action
              title="Delete Option"
              onAction={() => {
                removeOption(focusedOptionId);
                setFocusedOptionId(null);
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              style={Action.Style.Destructive}
            />
          )}
        </ActionPanel>
      }
    >
      {options.map((option, index) => (
        <Form.TextField
          key={option.id}
          id={option.id}
          title={`Option ${index + 1}`}
          placeholder={`Enter option ${index + 1}...`}
          value={option.value}
          autoFocus={option.id === lastAddedId}
          onFocus={() => setFocusedOptionId(option.id)}
          onChange={(value) => handleOptionChange(option.id, value)}
          onBlur={() => {
            // Only remove if it's empty AND NOT the last option
            // We always want to keep the last option empty for new entries
            if (option.value.trim() === "" && index !== options.length - 1) {
              removeOption(option.id);
            }
          }}
        />
      ))}
      <Form.Description text="💡 Tab to add • Cmd+Enter to decide • Cmd+D to delete • ESC to close" />
    </Form>
  );
}

interface ResultViewProps {
  selectedOption: string;
  allOptions: string[];
}

function ResultView({ selectedOption, allOptions }: ResultViewProps) {
  const [currentSelection, setCurrentSelection] = useState(selectedOption);

  async function rollAgain() {
    const randomIndex = Math.floor(Math.random() * allOptions.length);
    setCurrentSelection(allOptions[randomIndex]);
    const toast = await showToast({
      style: Toast.Style.Success,
      title: "Re-rolled!",
    });
    setTimeout(() => toast.hide(), 1000);
  }

  const probability = ((1 / allOptions.length) * 100).toFixed(1);

  const markdown = `
# 🏆 The Decision Has Been Made! 🎉

&nbsp;
&nbsp;

# ${currentSelection}

&nbsp;
&nbsp;

---
*Fate has spoken.*
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Winner" text={currentSelection} icon={Icon.Trophy} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Options" text={`${allOptions.length}`} icon={Icon.List} />
          <Detail.Metadata.Label title="Probability" text={`%${probability}`} icon={Icon.BarChart} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Candidates">
            {allOptions.map((opt, index) => (
              <Detail.Metadata.TagList.Item
                key={index}
                text={opt}
                color={opt === currentSelection ? Color.Green : Color.SecondaryText}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={currentSelection} />
          <Action title="Roll Again" onAction={rollAgain} icon={Icon.RotateClockwise} />
        </ActionPanel>
      }
    />
  );
}
