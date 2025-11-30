import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

type Preferences = {
  scriptCommandsPath: string;
  defaultVault?: string;
};

type FormValues = {
  title: string;
  choiceName: string;
  variableName: string;
  vaultName?: string;
  placeholder?: string;
};

const HOME_TILDE_REGEX = /^~/;
const WHITESPACE_REGEX = /\s+/g;

function generateScriptContent(
  values: FormValues,
  defaultVault?: string
): string {
  const vault = values.vaultName || defaultVault;
  const placeholder = values.placeholder || "QuickAdd Input";
  // biome-ignore lint/suspicious/noTemplateCurlyInString: bash variable syntax in generated script
  const vaultParam = vault ? "&vault=\\${VAULT}" : "";

  return `#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title ${values.title}
# @raycast.mode silent
# @raycast.packageName QuickAdd
# @raycast.icon 📝
# @raycast.argument1 { "type": "text", "placeholder": "${placeholder}" }

# QuickAdd Capture: ${values.title}
# Choice: ${values.choiceName}
# Variable: ${values.variableName}
${vault ? `# Vault: ${vault}` : ""}

CHOICE=$(osascript -l JavaScript -e "encodeURIComponent('${values.choiceName}')")
VARIABLE=$(osascript -l JavaScript -e "encodeURIComponent('${values.variableName}')")
${vault ? `VAULT=$(osascript -l JavaScript -e "encodeURIComponent('${vault}')")` : ""}
ENCODED=$(osascript -l JavaScript -e "encodeURIComponent('$1')")

open -g "obsidian://quickadd?choice=\${CHOICE}${vaultParam}&value-\${VARIABLE}=\${ENCODED}"
`;
}

function expandPath(path: string): string {
  return path.replace(HOME_TILDE_REGEX, process.env.HOME || "");
}

async function showError(title: string, message?: string) {
  await showToast({ style: Toast.Style.Failure, title, message });
}

async function validateAndGetScriptDir(
  preferences: Preferences
): Promise<string | null> {
  if (!preferences.scriptCommandsPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Script Commands path not set",
      message: "Please set the path in extension preferences",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return null;
  }

  const scriptDir = expandPath(preferences.scriptCommandsPath);

  if (!existsSync(scriptDir)) {
    try {
      mkdirSync(scriptDir, { recursive: true });
    } catch {
      await showError("Failed to create directory", scriptDir);
      return null;
    }
  }

  return scriptDir;
}

export default function CreateScriptCommand() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: FormValues) {
    if (!(values.title && values.choiceName && values.variableName)) {
      await showError("Missing required fields");
      return;
    }

    const scriptDir = await validateAndGetScriptDir(preferences);
    if (!scriptDir) {
      return;
    }

    const filename = `${values.title.toLowerCase().replace(WHITESPACE_REGEX, "-")}.sh`;
    const filepath = join(scriptDir, filename);

    if (existsSync(filepath)) {
      await showError(
        "Script already exists",
        `${filename} already exists in your Script Commands folder`
      );
      return;
    }

    try {
      const content = generateScriptContent(values, preferences.defaultVault);
      writeFileSync(filepath, content, { encoding: "utf-8" });
      chmodSync(filepath, 0o755);
      await showHUD(`✓ Created "${values.title}" - now available in Raycast`);
      await popToRoot();
    } catch (error) {
      await showError(
        "Failed to create script",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title="Create Script Command"
          />
          <Action
            onAction={openExtensionPreferences}
            title="Open Preferences"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Creates a Script Command that appears directly in Raycast search. Ensure Raycast script's directory is set." />

      <Form.TextField
        id="title"
        info="This is what you'll type in Raycast to trigger the capture"
        placeholder="Name for raycast"
        title="Script Command Name"
      />

      <Form.TextField
        id="choiceName"
        info="The exact name of your QuickAdd macro in Obsidian"
        placeholder="Name of QuickAdd Macro"
        title="QuickAdd Macro"
      />

      <Form.TextField
        id="variableName"
        info="The variable in your template (e.g., 'text' for {{VALUE:text}})"
        placeholder="QuickAdd Variable Name"
        title="Variable Name"
      />

      <Form.Separator />

      <Form.TextField
        id="placeholder"
        info="Hint text shown in the input field"
        placeholder="Placeholder Text"
        title="Input Placeholder"
      />

      <Form.TextField
        id="vaultName"
        info="Leave empty to use default vault from preferences"
        placeholder="My Vault"
        title="Vault (Optional)"
      />
    </Form>
  );
}
