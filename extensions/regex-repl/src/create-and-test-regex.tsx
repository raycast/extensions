import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getPreferenceValues,
  Keyboard,
  List,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import History from "./components/History";
import findAndProcessMatches from "./utils/find-and-process-matches";
import { HISTORY_KEY, MAX_HISTORY_SIZE, RegexHistoryItem, selectedRegex, setSelectedRegex } from "./utils/history";

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
  const preferences = getPreferenceValues<Preferences.CreateAndTestRegex>();
  const { push } = useNavigation();
  const {
    value: historyItems,
    setValue: setHistoryItems,
    isLoading: isHistoryLoading,
  } = useLocalStorage<RegexHistoryItem[]>(HISTORY_KEY, []);

  const [pattern, setPattern] = useState("([A-Z])\\w+");
  const [flags, setFlags] = useState<string[]>([flagOptions[0].value]);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState(false);
  const toastRef = useRef<Toast>(null);

  const firstMount = useRef(true);
  useEffect(() => {
    if (!preferences["use-last-used-pattern"]) {
      return;
    }

    if (historyItems && historyItems.length > 0 && firstMount.current) {
      setPattern(historyItems[0].pattern);
      setFlags(historyItems[0].flags);
      firstMount.current = false;
    }
  }, [historyItems]);

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

  const addToHistory = async (pattern: string, flags: string[]) => {
    if (isHistoryLoading || historyItems === undefined) {
      console.log("History is loading or not loaded");
      return;
    }

    const newItem = { pattern, flags, timestamp: Date.now(), isPinned: false };
    const filteredHistory = historyItems.filter(
      (item) => item.pattern !== pattern || item.flags.join("") !== flags.join("")
    );

    filteredHistory.unshift(newItem);
    while (filteredHistory.length > MAX_HISTORY_SIZE) {
      filteredHistory.pop();
    }

    setHistoryItems(filteredHistory);
  };

  const validateThenShowDetails = async (values: Values) => {
    let submitAction: (() => void) | undefined;
    if (error) {
      submitAction = undefined;
    } else if (!pattern) {
      submitAction = () =>
        showToast({ title: "Empty field", message: "Missing expression", style: Toast.Style.Failure });
    } else if (!text) {
      submitAction = () => showToast({ title: "Empty field", message: "Missing text", style: Toast.Style.Failure });
    } else {
      submitAction = () => {
        addToHistory(pattern, flags);
        push(<Details {...values} />);
      };
    }
    submitAction?.();
  };

  const updateRegexFromHistoryIfSelected = () => {
    if (selectedRegex) {
      setPattern(selectedRegex.pattern);
      setFlags(selectedRegex.flags);
    }

    setSelectedRegex(undefined);
  };

  return (
    <Form
      isLoading={isHistoryLoading}
      actions={
        <ActionPanel>
          <Action.Push target={<QuickReference />} title="Show Quick Reference" />
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
          <Action.Push
            target={<History />}
            title="Show History"
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onPop={updateRegexFromHistoryIfSelected}
          />
          <Action
            title="Save to History"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => {
              addToHistory(pattern, flags);
              showToast({
                title: "Saved to History",
                style: Toast.Style.Success,
              });
            }}
          />
          <Action
            title="Clear History"
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={() => {
              setHistoryItems([]);
              showToast({
                title: "History Cleared",
                style: Toast.Style.Success,
              });
            }}
          />
          {!error && text && pattern && <Action.SubmitForm onSubmit={validateThenShowDetails} title="Show Details" />}
        </ActionPanel>
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
          <Action title="Go Back" onAction={pop} />
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

const QuickReference = () => {
  const { pop } = useNavigation();
  const references = [
    {
      regex: "[abc]",
      description: "A single character of: a, b, or c",
      keywords: ["character"],
    },
    {
      regex: "[^abc]",
      description: "Any single character except: a, b, or c",
      keywords: ["character", "except", "not", "exclud"],
    },
    {
      regex: "[a-z]",
      description: "Any single character in the range a-z",
      keywords: ["character", "range", "between"],
    },
    {
      regex: "[a-zA-Z]",
      description: "Any single character in the range a-z or A-Z",
      keywords: ["character", "range", "between"],
    },
    {
      regex: "^",
      description: "Start of line",
      keywords: ["start", "line", "beginning"],
    },
    {
      regex: "$",
      description: "End of line",
      keywords: ["end", "line"],
    },
    {
      regex: "\\A",
      description: "Start of string",
      keywords: ["start", "string"],
    },
    {
      regex: "\\z",
      description: "End of string",
      keywords: ["end", "string"],
    },

    {
      regex: ".",
      description: "Any single character",
      keywords: ["any", "character", "everything"],
    },
    {
      regex: "\\s",
      description: "Any whitespace character",
      keywords: ["any", "whitespace", "character"],
    },
    {
      regex: "\\S",
      description: "Any non-whitespace character",
      keywords: ["any", "whitespace", "character"],
    },
    {
      regex: "\\d",
      description: "Any digit",
      keywords: ["any", "digit", "number"],
    },
    {
      regex: "\\D",
      description: "Any non-digit",
      keywords: ["any", "digit", "number"],
    },
    {
      regex: "\\w",
      description: "Any word character (letter, number, underscore)",
      keywords: ["word", "any"],
    },
    {
      regex: "\\W",
      description: "Any non-word character",
      keywords: ["word", "any"],
    },
    {
      regex: "\\b",
      description: "	Any word boundary",
      keywords: ["any", "word", "boundary"],
    },
    {
      regex: "(...)",
      description: "Capture everything enclosed",
      keywords: ["capture", "everything", "enclosed"],
    },
    {
      regex: "(a|b)",
      description: "a or b",
      keywords: ["or"],
    },
    {
      regex: "a?",
      description: "Zero or one of a",
      keywords: ["zero", "one", "0"],
    },
    {
      regex: "a*",
      description: "Zero or more of a",
      keywords: ["zero", "more", "0", "any"],
    },
    {
      regex: "a+",
      description: "One or more of a",
      keywords: ["one", "more", "least"],
    },
    {
      regex: "a{3}",
      description: "Exactly 3 of a",
      keywords: ["exactly", "times"],
    },
    {
      regex: "a{3,}",
      description: "3 or more of a",
      keywords: ["or", "more", "times", "least"],
    },
    {
      regex: "a{3,6}",
      description: "Between 3 and 6 of a",
      keywords: ["between"],
    },
  ];

  return (
    <List navigationTitle="Quick reference">
      {references.map((reference) => {
        return (
          <List.Item
            key={reference.regex}
            title={reference.regex}
            subtitle={reference.description}
            keywords={reference.keywords}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  onAction={async () => {
                    try {
                      await Clipboard.copy(reference.regex);
                      await showToast({
                        title: "Copied to clipboard",
                      });
                      pop();
                    } catch {
                      showToast({
                        title: "Failed to copy",
                        style: Toast.Style.Failure,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};
