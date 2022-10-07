import { Form, ActionPanel, Action, showToast, Detail, useNavigation, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import findAndProcessMatches from "./utils/find-and-process-matches";

type Values = {
  pattern: string;
  flags: string[];
  text: string;
};

const flagOptions = [
  { label: "(g)lobal", value: "g" },
  { label: "case-(i)nsensitive", value: "i" },
  { label: "(m)ultiline", value: "m" },
  { label: "(s)ingle line/ dotall", value: "s" },
  { label: "(u)nicode", value: "u" },
  { label: "stick(y)", value: "y" },
];

export default function Command() {
  const { push } = useNavigation();
  const [pattern, setPattern] = useState("([A-Z])\\w+");
  const [flags, setFlags] = useState<string[]>([flagOptions[0].value]);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState(false);
  const toastRef = useRef<Toast>();

  useEffect(() => {
    try {
      const { result } = findAndProcessMatches(pattern, flags, text, (m) => m.split("").join("\u0332") + "\u0332");
      setError(false);
      setResult(result);
      toastRef.current?.hide();
    } catch (err) {
      const error = err as Error;
      setError(true);
      // Use Animated style so that it doesn't disappear
      showToast({ title: "Error parsing regex", message: error.message, style: Toast.Style.Animated }).then(
        (t) => (toastRef.current = t)
      );
    }
  }, [pattern, flags, text]);

  const handleSubmit = (values: Values) => {
    let submitAction: (() => void) | undefined;
    if (error) {
      submitAction = undefined;
    } else if (!pattern) {
      submitAction = () =>
        showToast({ title: "Empty field", message: "Missing expression", style: Toast.Style.Failure });
    } else if (!text) {
      submitAction = () => showToast({ title: "Empty field", message: "Missing text", style: Toast.Style.Failure });
    } else {
      submitAction = () => push(<Details {...values} />);
    }
    submitAction?.();
  };

  return (
    <Form
      actions={
        !error &&
        text &&
        pattern && <ActionPanel>{<Action.SubmitForm onSubmit={handleSubmit} title="Show Details" />}</ActionPanel>
      }
    >
      <Form.TextField id="pattern" title="Expression" placeholder="Enter RegEx" value={pattern} onChange={setPattern} />
      <Form.TagPicker id="flags" title="Flags" value={flags} onChange={setFlags}>
        {flagOptions.map((flag) => (
          <Form.TagPicker.Item key={flag.value} value={flag.value} title={flag.label} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.TextArea id="text" title="Text" placeholder="Enter Text To Test" value={text} onChange={setText} />
      <Form.Description text={result} title="" />
    </Form>
  );
}

const Details: React.FC<Values> = ({ text, pattern, flags }) => {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [markdown, setMarkdown] = useState("");
  const [matches, setMatches] = useState<string[]>([]);

  useEffect(() => {
    let markdown = "";
    const { result, matchedSections } = findAndProcessMatches(pattern, flags, text, (m) => "`" + m + "`");
    // use double newline for markdown
    markdown = result.replaceAll(/\n/g, "\n\n");
    if (matchedSections.length > 0) {
      markdown = markdown + "\n\n **Matches**";
    }
    matchedSections.forEach((m) => {
      markdown = markdown + `\n\n \`${m}\``;
    });
    setMatches(matchedSections);
    setMarkdown(markdown);
    setIsLoading(false);
  }, [text]);

  const fullRegex = `/${pattern}/${flags.join("")}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle="Result Details"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Go Back" onSubmit={pop} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Pattern" text={pattern} />
          <Detail.Metadata.TagList title="Flags">
            {flags.map((flagValue) => {
              const label = flagOptions.find((f) => f.value === flagValue)?.label;
              return label ? <Detail.Metadata.TagList.Item text={label} key={flagValue} /> : null;
            })}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Raw" text={fullRegex} />
          <Detail.Metadata.Label title="No. of matches" text={`${matches.length}`} />
        </Detail.Metadata>
      }
    />
  );
};
