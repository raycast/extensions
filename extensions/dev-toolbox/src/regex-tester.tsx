import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import RandExp from "randexp";

const predefinedRegexes = {
  email: {
    title: "Email Address",
    pattern: "^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,6}$",
    description: "Matches standard email addresses.",
  },
  url: {
    title: "URL",
    pattern: "^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([\\/\\w .-]*)*\\/?$",
    description: "Matches URLs starting with http://, https://, or without protocol.",
  },
  phone: {
    title: "Phone Number",
    pattern: "^\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}$",
    description: "Matches international phone numbers with optional separators.",
  },
  ipv4: {
    title: "IPv4 Address",
    pattern: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
    description: "Matches valid IPv4 addresses.",
  },
  date: {
    title: "Date (YYYY-MM-DD)",
    pattern: "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$",
    description: "Matches dates in YYYY-MM-DD format.",
  },
  hexColor: {
    title: "Hex Color",
    pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
    description: "Matches 3 or 6 character hexadecimal color codes.",
  },
};

export default function RegexCreator() {
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [pattern, setPattern] = useState<string>("");
  const [testString, setTestString] = useState<string>("");
  const [flags, setFlags] = useState<string>("gmi");
  const [result, setResult] = useState<string>("Select a preset or enter a custom regex pattern.");
  const [description, setDescription] = useState<string>("Select a preset or enter a custom regex.");

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey !== "custom") {
      const regexInfo = predefinedRegexes[presetKey as keyof typeof predefinedRegexes];
      setPattern(regexInfo.pattern);
      setDescription(regexInfo.description);
    } else {
      setPattern("");
      setDescription("Enter a custom regular expression.");
    }
  };

  const handlePatternChange = (newPattern: string) => {
    setPattern(newPattern);
    if (selectedPreset !== "custom") {
      setSelectedPreset("custom");
      setDescription("Custom regular expression.");
    }
  };

  const testRegex = () => {
    try {
      const regex = new RegExp(pattern.trim(), flags);
      const matches = Array.from(testString.matchAll(regex));

      if (matches.length === 0) {
        setResult("No matches found.");
        return;
      }

      setResult(
        matches
          .map(
            (match, index) => `Match ${index + 1}:
  - Full: ${match[0]}
  - Groups: ${match.slice(1).join(", ") || "none"}
  - Index: ${match.index}`,
          )
          .join("\n\n"),
      );
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Invalid Regular Expression" });
      setResult("Invalid regex pattern.");
    }
  };

  const generateExample = () => {
    if (!pattern.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a regex pattern first." });
      return;
    }

    try {
      const regex = new RegExp(pattern.trim(), flags);
      const randexpgen = new RandExp(regex);
      const example = randexpgen.gen();

      setTestString(example);
      showToast({ style: Toast.Style.Success, title: "Example generated!" });
      setResult("Example generated. Click 'Test Regex' to check.");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate example",
        message: "This regex pattern might contain unsupported features",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Test Regex" onSubmit={testRegex} />
          <Action title="Generate Example" onAction={generateExample} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="preset" title="Preset Patterns" value={selectedPreset} onChange={handlePresetChange}>
        <Form.Dropdown.Item key="custom" value="custom" title="Custom" />
        {Object.entries(predefinedRegexes).map(([key, regex]) => (
          <Form.Dropdown.Item key={key} value={key} title={regex.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="pattern"
        title="Regular Expression"
        placeholder="Enter regex pattern"
        value={pattern}
        onChange={handlePatternChange}
      />

      <Form.Description text={description} />

      <Form.TextArea
        id="testString"
        title="Test String"
        placeholder="Enter text to test"
        value={testString}
        onChange={setTestString}
      />

      <Form.Dropdown id="flags" title="Flags" value={flags} onChange={setFlags}>
        <Form.Dropdown.Item value="g" title="Global (g)" />
        <Form.Dropdown.Item value="i" title="Case Insensitive (i)" />
        <Form.Dropdown.Item value="m" title="Multiline (m)" />
        <Form.Dropdown.Item value="gi" title="Global + Case Insensitive" />
        <Form.Dropdown.Item value="gm" title="Global + Multiline" />
        <Form.Dropdown.Item value="gmi" title="All Flags" />
      </Form.Dropdown>

      <Form.Description text={result} />
    </Form>
  );
}
