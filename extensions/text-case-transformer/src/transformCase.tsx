import {
  Action,
  ActionPanel,
  Clipboard,
  getSelectedText,
  List,
  showHUD,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface CaseTransformation {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  transform: (text: string) => string;
}

const transformations: CaseTransformation[] = [
  {
    id: "lowercase",
    title: "lowercase",
    description: "Convert text to all lowercase letters",
    icon: Icon.ArrowDown,
    transform: (text: string) => text.toLowerCase(),
  },
  {
    id: "uppercase",
    title: "UPPERCASE",
    description: "Convert text to all uppercase letters",
    icon: Icon.ArrowUp,
    transform: (text: string) => text.toUpperCase(),
  },
  {
    id: "camelCase",
    title: "camelCase",
    description: "Convert text to camelCase format",
    icon: Icon.TextCursor,
    transform: (text: string) => {
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
    },
  },
  {
    id: "pascalCase",
    title: "PascalCase",
    description: "Convert text to PascalCase format",
    icon: Icon.Text,
    transform: (text: string) => {
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
          return word.toUpperCase();
        })
        .replace(/\s+/g, "");
    },
  },
  {
    id: "snakeCase",
    title: "snake_case",
    description: "Convert text to snake_case format",
    icon: Icon.Sidebar,
    transform: (text: string) => {
      return text
        .replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map((word) => word.toLowerCase())
        .join("_");
    },
  },
  {
    id: "kebabCase",
    title: "kebab-case",
    description: "Convert text to kebab-case format",
    icon: Icon.Minus,
    transform: (text: string) => {
      return text
        .replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map((word) => word.toLowerCase())
        .join("-");
    },
  },
  {
    id: "constantCase",
    title: "CONSTANT_CASE",
    description: "Convert text to CONSTANT_CASE format",
    icon: Icon.ExclamationMark,
    transform: (text: string) => {
      return text
        .replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map((word) => word.toUpperCase())
        .join("_");
    },
  },
  {
    id: "titleCase",
    title: "Title Case",
    description: "Convert Text To Title Case Format",
    icon: Icon.Uppercase,
    transform: (text: string) => {
      return text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    },
  },
  {
    id: "sentenceCase",
    title: "Sentence case",
    description: "Convert text to sentence case format",
    icon: Icon.Text,
    transform: (text: string) => {
      const words = text.toLowerCase().split(" ");
      if (words.length > 0) {
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      }
      return words.join(" ");
    },
  },
  {
    id: "dotCase",
    title: "dot.case",
    description: "Convert text to dot.case format",
    icon: Icon.Dot,
    transform: (text: string) => {
      return text
        .replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map((word) => word.toLowerCase())
        .join(".");
    },
  },
];

export default function TransformCase() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getInitialText() {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
      } catch (error) {
        try {
          const clipboardText = await Clipboard.readText();
          setSelectedText(clipboardText || "");
        } catch (clipboardError) {
          setSelectedText("");
        }
      } finally {
        setIsLoading(false);
      }
    }

    getInitialText();
  }, []);

  async function handleTransform(
    transformation: CaseTransformation,
    action: "copy" | "paste",
  ) {
    if (!selectedText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text available",
        message: "Please select some text or copy text to clipboard",
      });
      return;
    }

    try {
      const transformedText = transformation.transform(selectedText);

      if (action === "paste") {
        await Clipboard.paste(transformedText);
        await showHUD(`Pasted ${transformation.title}`);
      } else {
        await Clipboard.copy(transformedText);
        await showHUD(`Copied ${transformation.title}`);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Transformation failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    // @ts-expect-error - React type compatibility issue
    <List
      searchBarPlaceholder="Search case transformations..."
      isShowingDetail={selectedText.length > 0}
      isLoading={isLoading}
    >
      {transformations.map((transformation) => {
        const transformedText = selectedText.trim()
          ? transformation.transform(selectedText)
          : "";

        return (
          // @ts-expect-error - React type compatibility issue
          <List.Item
            key={transformation.id}
            title={transformation.title}
            subtitle={transformation.description}
            icon={transformation.icon}
            detail={
              selectedText.trim() ? (
                // @ts-expect-error - React type compatibility issue
                <List.Item.Detail
                  markdown={`**Original:**\n\`\`\`\n${selectedText}\n\`\`\`\n\n**${transformation.title}:**\n\`\`\`\n${transformedText}\n\`\`\``}
                />
              ) : undefined
            }
            actions={
              // @ts-expect-error - React type compatibility issue
              <ActionPanel>
                {/* @ts-expect-error - React type compatibility issue */}
                <Action
                  title="Paste Transformation"
                  icon={Icon.Clipboard}
                  onAction={() => handleTransform(transformation, "paste")}
                />
                {/* @ts-expect-error - React type compatibility issue */}
                <Action
                  title="Copy Transformation"
                  icon={Icon.CopyClipboard}
                  onAction={() => handleTransform(transformation, "copy")}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
