import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  getSelectedText,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { executePrompt, ClaudeResponse } from "./lib/claude-cli";

interface Transform {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  prompt: string;
  outputAction: "detail" | "copy" | "paste";
  requiresVariable?: string;
  tintColor?: Color;
}

const TRANSFORMS: Transform[] = [
  {
    id: "explain",
    title: "Explain Code",
    description: "Explain what this code does and why",
    icon: Icon.QuestionMark,
    prompt: `Explain this code concisely:

\`\`\`
{{code}}
\`\`\`

Cover:
1. What it does (high-level purpose)
2. How it works (key logic)
3. Any notable patterns or techniques used

Keep it brief but informative.`,
    outputAction: "detail",
    tintColor: Color.Blue,
  },
  {
    id: "explain-regex",
    title: "Explain Regex",
    description: "Explain this regex pattern in plain English",
    icon: Icon.MagnifyingGlass,
    prompt: `Explain this regex pattern in plain English:

\`\`\`
{{code}}
\`\`\`

Include:
1. What it matches (with examples)
2. Breakdown of each component
3. Edge cases or limitations

Use simple language.`,
    outputAction: "detail",
    tintColor: Color.Purple,
  },
  {
    id: "find-bugs",
    title: "Find Bugs",
    description: "Identify bugs and potential issues",
    icon: Icon.Bug,
    prompt: `Analyze this code for bugs and potential issues:

\`\`\`
{{code}}
\`\`\`

Look for:
- Logic errors
- Edge cases not handled
- Potential null/undefined issues
- Off-by-one errors
- Race conditions
- Security vulnerabilities

For each issue, explain the problem and suggest a fix.`,
    outputAction: "detail",
    tintColor: Color.Red,
  },
  {
    id: "convert-language",
    title: "Convert to Language",
    description: "Convert code to another programming language",
    icon: Icon.Switch,
    prompt: `Convert this code to {{language}}:

\`\`\`
{{code}}
\`\`\`

Preserve the logic and use idiomatic patterns for the target language.
Return only the converted code without explanation.`,
    outputAction: "copy",
    requiresVariable: "language",
    tintColor: Color.Green,
  },
  {
    id: "add-types",
    title: "Add TypeScript Types",
    description: "Add TypeScript types to JavaScript code",
    icon: Icon.Code,
    prompt: `Add TypeScript types to this JavaScript code:

\`\`\`
{{code}}
\`\`\`

Guidelines:
- Use specific types, avoid 'any'
- Add interfaces for object shapes
- Use generics where appropriate
- Add JSDoc comments for complex types

Return only the typed code.`,
    outputAction: "copy",
    tintColor: Color.Blue,
  },
  {
    id: "optimize",
    title: "Optimize Code",
    description: "Optimize for performance",
    icon: Icon.Bolt,
    prompt: `Optimize this code for performance:

\`\`\`
{{code}}
\`\`\`

Consider:
- Time complexity improvements
- Memory usage reduction
- Unnecessary operations
- Caching opportunities

Show the optimized code and explain what changed.`,
    outputAction: "detail",
    tintColor: Color.Yellow,
  },
  {
    id: "add-comments",
    title: "Add Comments",
    description: "Add helpful comments to code",
    icon: Icon.Bookmark,
    prompt: `Add helpful comments to this code:

\`\`\`
{{code}}
\`\`\`

Guidelines:
- Explain the "why", not the "what"
- Document non-obvious logic
- Add JSDoc for functions
- Keep comments concise

Return only the commented code.`,
    outputAction: "copy",
    tintColor: Color.Orange,
  },
  {
    id: "simplify",
    title: "Simplify Code",
    description: "Simplify and clean up code",
    icon: Icon.Eraser,
    prompt: `Simplify this code:

\`\`\`
{{code}}
\`\`\`

Goals:
- Reduce complexity
- Improve readability
- Remove redundancy
- Use modern syntax where beneficial

Preserve all functionality. Return only the simplified code.`,
    outputAction: "copy",
    tintColor: Color.Magenta,
  },
  {
    id: "write-tests",
    title: "Write Tests",
    description: "Generate unit tests for this code",
    icon: Icon.CheckCircle,
    prompt: `Write comprehensive unit tests for this code:

\`\`\`
{{code}}
\`\`\`

Include tests for:
- Happy path scenarios
- Edge cases
- Error conditions
- Boundary values

Use Jest/Vitest syntax. Make tests clear and well-organized.`,
    outputAction: "detail",
    tintColor: Color.Green,
  },
  {
    id: "generate-types",
    title: "Generate Types from JSON",
    description: "Generate TypeScript types from JSON data",
    icon: Icon.Document,
    prompt: `Generate TypeScript types/interfaces from this JSON:

\`\`\`json
{{code}}
\`\`\`

Guidelines:
- Use interfaces for objects
- Make optional fields explicit with ?
- Use appropriate primitive types
- Add helpful comments for unclear fields

Return only the type definitions.`,
    outputAction: "copy",
    tintColor: Color.Blue,
  },
];

export default function TransformSelection() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  useEffect(() => {
    async function getSelection() {
      try {
        const text = await getSelectedText();
        setSelectedText(text.trim() || null);
      } catch {
        // No selection available
        setSelectedText(null);
      }
      setIsLoading(false);
    }
    getSelection();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!selectedText) {
    return (
      <List>
        <List.EmptyView
          title="No Text Selected"
          description="Select some code in any application and try again"
          icon={Icon.Text}
        />
      </List>
    );
  }

  const preview =
    selectedText.length > 100
      ? selectedText.slice(0, 100) + "..."
      : selectedText;

  return (
    <List searchBarPlaceholder="Search transforms...">
      <List.Section
        title="Selected Text"
        subtitle={`${selectedText.length} characters`}
      >
        <List.Item
          title={preview}
          icon={Icon.Text}
          accessories={[{ text: `${selectedText.split("\n").length} lines` }]}
        />
      </List.Section>

      <List.Section title="Transforms">
        {TRANSFORMS.map((transform) => (
          <TransformItem
            key={transform.id}
            transform={transform}
            selectedText={selectedText}
          />
        ))}
      </List.Section>
    </List>
  );
}

function TransformItem({
  transform,
  selectedText,
}: {
  transform: Transform;
  selectedText: string;
}) {
  const { push } = useNavigation();

  function handleExecute() {
    if (transform.requiresVariable) {
      push(
        <TransformVariableForm
          transform={transform}
          selectedText={selectedText}
        />,
      );
    } else {
      push(
        <ExecutingTransformView
          transform={transform}
          selectedText={selectedText}
          variables={{}}
        />,
      );
    }
  }

  return (
    <List.Item
      title={transform.title}
      subtitle={transform.description}
      icon={{ source: transform.icon, tintColor: transform.tintColor }}
      accessories={[
        {
          tag: transform.outputAction === "detail" ? "View" : "Copy",
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Execute" icon={Icon.Play} onAction={handleExecute} />
        </ActionPanel>
      }
    />
  );
}

function TransformVariableForm({
  transform,
  selectedText,
}: {
  transform: Transform;
  selectedText: string;
}) {
  const { push } = useNavigation();

  const languages = [
    "Python",
    "JavaScript",
    "TypeScript",
    "Go",
    "Rust",
    "Java",
    "C#",
    "C++",
    "Ruby",
    "Swift",
    "Kotlin",
    "PHP",
  ];

  async function handleSubmit(values: Record<string, string>) {
    const variableName = transform.requiresVariable!;
    if (!values[variableName]?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Please select a ${variableName}`,
      });
      return;
    }

    push(
      <ExecutingTransformView
        transform={transform}
        selectedText={selectedText}
        variables={values}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Execute"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Transform" text={transform.title} />

      {transform.requiresVariable === "language" && (
        <Form.Dropdown id="language" title="Target Language">
          {languages.map((lang) => (
            <Form.Dropdown.Item key={lang} title={lang} value={lang} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

function ExecutingTransformView({
  transform,
  selectedText,
  variables,
}: {
  transform: Transform;
  selectedText: string;
  variables: Record<string, string>;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ClaudeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function execute() {
      try {
        // Build the prompt
        let prompt = transform.prompt.replace("{{code}}", selectedText);

        // Substitute any other variables
        for (const [key, value] of Object.entries(variables)) {
          prompt = prompt.replace(`{{${key}}}`, value);
        }

        // Use haiku for fast transforms
        const response = await executePrompt(prompt, {
          model: "haiku",
        });

        setResult(response);

        // Auto-copy for copy transforms
        if (transform.outputAction === "copy" && response.result) {
          await Clipboard.copy(response.result);
          await showToast({
            style: Toast.Style.Success,
            title: "Copied to clipboard",
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    }

    execute();
  }, []);

  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown={`# ${transform.title}\n\nTransforming...`}
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={error} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# ${transform.title}\n\n${result?.result || "No result"}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {result?.total_cost_usd && (
            <Detail.Metadata.Label
              title="Cost"
              text={`$${result.total_cost_usd.toFixed(4)}`}
            />
          )}
          {result?.usage && (
            <Detail.Metadata.Label
              title="Tokens"
              text={`${result.usage.input_tokens} in / ${result.usage.output_tokens} out`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={result?.result || ""}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Paste
            title="Paste Result"
            content={result?.result || ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
          <Action.CopyToClipboard
            title="Copy as Code Block"
            content={`\`\`\`\n${result?.result || ""}\n\`\`\``}
          />
        </ActionPanel>
      }
    />
  );
}
