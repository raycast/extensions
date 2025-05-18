import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import OpenAI from "openai";
import { useEffect, useState } from "react";

type Preferences = {
  apiKey: string;
  shell: string;
};

type CommandResult = {
  command: string;
  description: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { query: string }) {
    const { apiKey, shell } = getPreferenceValues<Preferences>();

    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OpenAI API Key Missing",
        message: "Please set your OpenAI API Key in the extension preferences",
      });
      return;
    }

    if (!values.query.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Request",
        message: "Please enter a description of the command you want",
      });
      return;
    }

    setIsLoading(true);
    try {
      push(<CommandList query={values.query} shell={shell} apiKey={apiKey} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Commands" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Command Description"
        placeholder="Describe what you want the command to do..."
        value={query}
        onChange={setQuery}
        enableMarkdown={false}
      />
    </Form>
  );
}

function CommandList({ query, shell, apiKey }: { query: string; shell: string; apiKey: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [commands, setCommands] = useState<CommandResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generateCommands() {
    try {
      const openai = new OpenAI({ apiKey });

      // Prepare the prompt to generate commands
      const systemPrompt = `You are a helpful CLI assistant that generates ${shell} shell commands based on user requests. 
      Generate exactly 3 commands for the user's request. Return only the commands in this format:
      - Command: COMMAND_HERE
      - Description: BRIEF_DESCRIPTION_HERE
      
      Keep commands concise so they don't get truncated in the UI. Keep descriptions brief but informative.
      No additional explanations, intros, or other text. Just 3 command-description pairs in the format described.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${shell} commands for: ${query}` },
        ],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Process the response to extract commands and descriptions
      const extractedCommands = parseCommands(content);
      setCommands(extractedCommands);
    } catch (error) {
      console.error("Error generating commands:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // Parse the response from OpenAI to extract commands and descriptions
  function parseCommands(content: string): CommandResult[] {
    const results: CommandResult[] = [];
    const lines = content.split("\n");

    let currentCommand: Partial<CommandResult> = {};

    for (const line of lines) {
      const commandMatch = line.match(/^-?\s*Command:?\s*(.+)$/i);
      const descriptionMatch = line.match(/^-?\s*Description:?\s*(.+)$/i);

      if (commandMatch) {
        if (currentCommand.command) {
          // Save the previous command if it exists
          if (currentCommand.description) {
            results.push(currentCommand as CommandResult);
          }
          currentCommand = {};
        }
        currentCommand.command = commandMatch[1].trim();
      } else if (descriptionMatch) {
        currentCommand.description = descriptionMatch[1].trim();
        if (currentCommand.command) {
          results.push(currentCommand as CommandResult);
          currentCommand = {};
        }
      }
    }

    // Add the last command if it exists
    if (currentCommand.command && currentCommand.description) {
      results.push(currentCommand as CommandResult);
    }

    return results;
  }

  // Generate commands on component mount
  useEffect(() => {
    generateCommands();
  }, []);

  // If there's an error, show it
  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={generateCommands} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter commands..." isShowingDetail>
      {commands.map((item, index) => (
        <List.Item
          key={index}
          title={item.command}
          detail={<List.Item.Detail markdown={"```bash\n" + item.command + "\n```\n\n" + item.description} />}
          actions={
            <ActionPanel>
              <Action
                title="Copy Command"
                onAction={async () => {
                  await Clipboard.copy(item.command);
                  await showHUD("Command Copied to Clipboard");
                  // Close the extension UI
                  await closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {commands.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Commands Generated"
          description="Try a different query or check your OpenAI API key."
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={generateCommands} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
