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
  packageManager: "pnpm" | "yarn" | "npm";
  directory: string;
}

interface Arguments {
  appName: string;
}

const getCreateCommand = (packageManager: Preferences["packageManager"]) => {
  switch (packageManager) {
    case "pnpm":
      return "pnpm create t3-app@latest";
    case "yarn":
      return "yarn create t3-app@latest";
    case "npm":
      return "npx -y create-t3-app@latest";
  }
};

const getInstallCommand = (packageManager: Preferences["packageManager"]) => {
  switch (packageManager) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn";
    case "npm":
      return "npm install";
  }
};

type Values = {
  appName: string;
  dir: string[];

  "next-auth": boolean;
  prisma: boolean;
  tailwind: boolean;
  trpc: boolean;
  git: boolean;
  install: boolean;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferenceValues<Preferences>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [langError, setLangError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
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

    command.push(values.appName || "my-t3-app");

    if (!values.git) command.push("--noGit");
    if (!values.install) command.push("--noInstall");

    command.push("--CI");

    if (values["next-auth"]) command.push("--nextAuth");
    if (values.prisma) command.push("--prisma");
    if (values.tailwind) command.push("--tailwind");
    if (values.trpc) command.push("--trpc");

    console.log(command.join(" "));

    showToast({
      title: "Creating T3 app...",
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
          <Action.SubmitForm onSubmit={handleSubmit} title="Create App" />
          <Action onAction={() => openCommandPreferences()} title="Change Extension Preferences" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="appName"
        title="Project Name"
        placeholder="my-t3-app"
        defaultValue={props.arguments.appName}
        error={nameError}
        onChange={(value) => {
          dropNameErrorIfNeeded();
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
      <Form.Checkbox id="next-auth" label="Next Auth" storeValue />
      <Form.Checkbox id="prisma" label="Prisma" storeValue />
      <Form.Checkbox id="tailwind" label="Tailwind" storeValue />
      <Form.Checkbox id="trpc" label="tRPC" storeValue />
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
