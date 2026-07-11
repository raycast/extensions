import { ActionPanel, Action, Form, Detail, useNavigation, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface FormValues {
  inputText: string;
}

// First Screen: Text Input Form
function TextInputForm() {
  const { push } = useNavigation();
  const [inputText, setInputText] = useState<string>("");

  // Load clipboard content on mount
  useEffect(() => {
    async function loadClipboard() {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          setInputText(clipboardText);
        }
      } catch {
        // Silently fail if clipboard is empty or inaccessible
      }
    }
    loadClipboard();
  }, []);

  const handleSubmit = (values: FormValues) => {
    if (!values.inputText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter some text to format",
      });
      return;
    }

    push(<RTLDisplayScreen text={values.inputText} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Format Text"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={handleSubmit}
          />
          <Action
            title="Paste from Clipboard"
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              try {
                const clipboardText = await Clipboard.readText();
                if (clipboardText) {
                  setInputText(clipboardText);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Pasted",
                    message: "Text pasted from clipboard",
                  });
                } else {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Error",
                    message: "Clipboard is empty",
                  });
                }
              } catch {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Error",
                  message: "Failed to read clipboard",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="inputText"
        title="Text to Format"
        placeholder="Enter or paste text that contains RTL content (Arabic, Hebrew, Kurdish, etc.)"
        value={inputText}
        onChange={setInputText}
        autoFocus
      />
      <Form.Description text="Press ⌘+Enter to format the text for RTL reading, or ⌘+V to paste from clipboard." />
    </Form>
  );
}

// Second Screen: RTL Formatted Text Display
function RTLDisplayScreen({ text }: { text: string }) {
  const { pop } = useNavigation();

  // Function to detect RTL characters
  const hasRTLCharacters = (text: string): boolean => {
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return rtlRegex.test(text);
  };

  // Function to detect if text contains markdown syntax
  const hasMarkdownSyntax = (text: string): boolean => {
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /\*\*.*?\*\*/, // Bold
      /\*.*?\*/, // Italic (but not bold)
      /~~.*?~~/, // Strikethrough
      /`.*?`/, // Inline code
      /```[\s\S]*?```/, // Code blocks
      /^\s*[-*+]\s+/m, // Unordered lists
      /^\s*\d+\.\s+/m, // Ordered lists
      /^\s*>\s+/m, // Blockquotes
      /\[.*?\]\(.*?\)/, // Links
      /!\[.*?\]\(.*?\)/, // Images
      /^\s*\|.*\|/m, // Tables
      /^---+$/m, // Horizontal rules
    ];

    return markdownPatterns.some((pattern) => pattern.test(text));
  };

  // Function to apply RTL formatting to content within markdown elements
  const applyRTLToMarkdownContent = (text: string): string => {
    // Process different markdown elements while preserving their structure

    // Handle headers (# ## ### etc.)
    text = text.replace(/^(#{1,6}\s+)(.+)$/gm, (match, prefix, content) => {
      if (hasRTLCharacters(content)) {
        return `${prefix}‏${content.trim()}‏`;
      }
      return match;
    });

    // Handle bold text (**text**)
    text = text.replace(/(\*\*)(.*?)(\*\*)/g, (match, openTag, content, closeTag) => {
      if (hasRTLCharacters(content)) {
        return `${openTag}‏${content}‏${closeTag}`;
      }
      return match;
    });

    // Handle italic text (*text* but not **text**)
    text = text.replace(/(?<!\*)(\*)(?!\*)([^*]+?)(?<!\*)(\*)(?!\*)/g, (match, openTag, content, closeTag) => {
      if (hasRTLCharacters(content)) {
        return `${openTag}‏${content}‏${closeTag}`;
      }
      return match;
    });

    // Handle strikethrough (~~text~~)
    text = text.replace(/(~~)(.*?)(~~)/g, (match, openTag, content, closeTag) => {
      if (hasRTLCharacters(content)) {
        return `${openTag}‏${content}‏${closeTag}`;
      }
      return match;
    });

    // Handle list items
    text = text.replace(/^(\s*[-*+]\s+)(.+)$/gm, (match, prefix, content) => {
      if (hasRTLCharacters(content)) {
        return `${prefix}‏${content.trim()}‏`;
      }
      return match;
    });

    // Handle ordered list items
    text = text.replace(/^(\s*\d+\.\s+)(.+)$/gm, (match, prefix, content) => {
      if (hasRTLCharacters(content)) {
        return `${prefix}‏${content.trim()}‏`;
      }
      return match;
    });

    // Handle blockquotes
    text = text.replace(/^(\s*>\s+)(.+)$/gm, (match, prefix, content) => {
      if (hasRTLCharacters(content)) {
        return `${prefix}‏${content.trim()}‏`;
      }
      return match;
    });

    // Handle link text [text](url)
    text = text.replace(/(\[)(.*?)(\]\([^)]*\))/g, (match, openBracket, linkText, urlPart) => {
      if (hasRTLCharacters(linkText)) {
        return `${openBracket}‏${linkText}‏${urlPart}`;
      }
      return match;
    });

    // Handle table cells (basic support)
    text = text.replace(/(\|)([^|]+)(\|)/g, (match, openPipe, content, closePipe) => {
      if (hasRTLCharacters(content)) {
        return `${openPipe}‏${content.trim()}‏${closePipe}`;
      }
      return match;
    });

    // Handle regular paragraphs (lines that don't start with markdown syntax)
    text = text.replace(/^(?!#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\|.*\||```|---|\s*$)(.+)$/gm, (match, content) => {
      if (hasRTLCharacters(content)) {
        return `‏${content.trim()}‏`;
      }
      return match;
    });

    return text;
  };

  // Function to format text for better RTL display
  const formatRTLText = (text: string): string => {
    // Check if the text contains markdown syntax
    if (hasMarkdownSyntax(text)) {
      // Apply RTL formatting while preserving markdown structure
      return applyRTLToMarkdownContent(text);
    } else {
      // Original behavior for plain text
      const paragraphs = text.split(/\n\s*\n/);

      return paragraphs
        .map((paragraph) => {
          // Clean up the paragraph
          const cleanParagraph = paragraph.trim();
          if (!cleanParagraph) return "";

          // If the paragraph contains RTL characters, format it appropriately
          if (hasRTLCharacters(cleanParagraph)) {
            // Add RTL mark and format for better display
            return `‏${cleanParagraph}‏`;
          }

          return cleanParagraph;
        })
        .filter((p) => p.length > 0)
        .join("\n\n");
    }
  };

  const formattedText = formatRTLText(text);

  // Create markdown with proper RTL formatting
  // If the original text already contains markdown, don't wrap it in additional structure
  const rtlMarkdown = hasMarkdownSyntax(text)
    ? formattedText
    : `

${formattedText}

---
`;

  return (
    <Detail
      markdown={rtlMarkdown}
      navigationTitle="RTL Formatted Text"
      actions={
        <ActionPanel>
          <Action title="Go Back" shortcut={{ modifiers: [], key: "escape" }} onAction={pop} />
          <Action.CopyToClipboard
            title="Copy Formatted Text"
            content={formattedText}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Original Text"
            content={text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action title="Edit Text" shortcut={{ modifiers: ["cmd"], key: "e" }} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

// Main Command Component
export default function Command() {
  return <TextInputForm />;
}
