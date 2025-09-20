import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  type LaunchProps,
  openCommandPreferences,
} from "@raycast/api";
import { useState } from "react";
import { runAppleScript } from "run-applescript";
import fs from "fs";

interface Preferences {
  packageManager: "npm" | "yarn" | "pnpm";
  directory: string;
}

interface Arguments {
  appName: string;
}

const getCreateCommand = (packageManager: Preferences["packageManager"]) => {
  switch (packageManager) {
    case "npm":
      return "npx -y create-remix@latest";
    case "yarn":
      return "yarn create-remix@latest";
    case "pnpm":
      return "pnpm create-remix@latest";
  }
};

const getInstallCommand = (packageManager: Preferences["packageManager"]) => {
  switch (packageManager) {
    case "npm":
      return "npm install";
    case "yarn":
      return "yarn";
    case "pnpm":
      return "pnpm install";
  }
};

type Values = {
  appName: string;
  dir: string[];
  "template-remix": boolean;
  typescript: boolean;
  git: boolean;
  install: boolean;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferenceValues<Preferences>();
  const [nameError, setNameError] = useState<string | undefined>();

  function nameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  async function handleSubmit(values: Values) {
    // in case the user updates their preferences while the form is open
    const prefs = getPreferenceValues<Preferences>();

    const folder = values.dir[0];
    if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
      return false;
    }

    const command = [getCreateCommand(prefs.packageManager)];

    command.push(values.appName || "my-remix-app");

    if (!values.install) command.push("--no-install");
    if (!values.typescript) command.push("--no-typescript");

    if (values["template-remix"]) command.push("--template remix");
    if (values["git"]) command.push("git init");
    if (values["typescript"]) command.push("--typescript");
    if (values["install"]) command.push("--install");

    console.log(command.join(" "));

    showToast({
      title: "Creating Remix Run web app...",
      message: "Check the terminal window to see how it's going",
    });

    await runAppleScript(`
      tell application "Terminal"
        activate
        set shell to do script "cd ${folder} && ${command.join(" ")}"
      end tell
    `);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Remix App" />
          <Action onAction={() => openCommandPreferences()} title="Change Extension Preferences" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="appName"
        title="Project Name"
        placeholder="my-remix-app"
        defaultValue={props.arguments.appName}
        error={nameError}
        onChange={(value) => {
          nameErrorIfNeeded();
          if (!value) return;
          if (!/^[\w-]+$/.test(value)) {
            setNameError("Project name cannot contain spaces or special characters");
          }
        }}
        autoFocus
      />
      <Form.FilePicker
        id="dir"
        title="Location"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        defaultValue={[prefs.directory]}
      />
      <Form.Description text="Which packages would you like to enable?" />
      <Form.Checkbox id="template-remix" label="Remix Default Template" storeValue defaultValue={true} />
      <Form.Checkbox id="typescript" label="Enable Typescript (you should)" storeValue defaultValue={true} />
      <Form.Separator />
      <Form.Checkbox id="git" label="Initialize a new git repository" storeValue defaultValue={true} />
      <Form.Separator />
      <Form.Checkbox
        id="install"
        label={`Run '${getInstallCommand(prefs.packageManager)}'`}
        storeValue
        defaultValue={true}
      />
    </Form>
  );
}
