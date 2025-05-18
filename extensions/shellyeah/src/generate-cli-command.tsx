import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const needsOnboardingFlag = (await LocalStorage.getItem("needsOnboarding")) as string | undefined;
        const { apiKey } = getPreferenceValues<Preferences>();
        const savedApiKey = (await LocalStorage.getItem("savedApiKey")) as string | undefined;

        if (needsOnboardingFlag === "true" || (!apiKey && !savedApiKey)) {
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboarding();
  }, []);

  async function handleSubmit(values: { query: string }) {
    const prefsValues = getPreferenceValues<Preferences>();
    const savedApiKey = (await LocalStorage.getItem("savedApiKey")) as string | undefined;
    const savedShell = ((await LocalStorage.getItem("savedShell")) as string | undefined) || "bash";

    const apiKey = savedApiKey || prefsValues.apiKey;
    const shell = savedShell || prefsValues.shell;

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
      await LocalStorage.removeItem("needsOnboarding");
      push(<CommandList query={values.query} shell={shell} apiKey={apiKey} />);
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (needsOnboarding) {
    return <Onboarding />;
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

function Onboarding() {
  const [apiKey, setApiKey] = useState("");
  const [shell, setShell] = useState("bash");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSavePreferences() {
    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please enter your OpenAI API key",
      });
      return;
    }

    setIsLoading(true);
    try {
      await LocalStorage.setItem("savedApiKey", apiKey);
      await LocalStorage.setItem("savedShell", shell);
      await LocalStorage.removeItem("needsOnboarding");

      await showToast({
        style: Toast.Style.Success,
        title: "Preferences Saved",
        message: "You're all set!",
      });

      pop();
    } catch (error) {
      console.error(error);
      await showFailureToast(
        "Error Saving Preferences: " + (error instanceof Error ? error.message : "Unknown error occurred"),
      );
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" onSubmit={handleSavePreferences} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Welcome to Shellyeah"
        text="Before you can generate CLI commands, you need to set up a few things:"
      />

      <Form.PasswordField id="apiKey" title="OpenAI API Key" placeholder="sk-..." value={apiKey} onChange={setApiKey} />

      <Form.Dropdown id="shell" title="Preferred Shell" value={shell} onChange={setShell}>
        <Form.Dropdown.Item value="bash" title="Bash" />
        <Form.Dropdown.Item value="zsh" title="Zsh" />
        <Form.Dropdown.Item value="fish" title="Fish" />
      </Form.Dropdown>
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

      const systemPrompt = `You are a helpful CLI assistant that generates ${shell} shell commands based on user requests. 
      Generate exactly 3 commands for the user's request. Return only the commands in this format:
      - Command: COMMAND_HERE
      - Description: BRIEF_DESCRIPTION_HERE
      
      Keep descriptions brief but informative.
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
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await showFailureToast("Error generating commands: " + errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

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
