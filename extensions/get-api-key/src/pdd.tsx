import * as fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { useState } from "react";
import { ActionPanel, Action, Detail, getPreferenceValues, openExtensionPreferences, LaunchProps } from "@raycast/api";

import { parseToJSON, findApiKey } from "./utils";

interface Preferences {
  hockeyStackPath: string;
}

export default function Command(props: LaunchProps<{ arguments: { customer: string } }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  if (!preferences.hockeyStackPath) {
    return (
      <Detail
        markdown="# Please set the HockeyStack App Path in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const customer = props.arguments.customer;
  const filePath = path.join(preferences.hockeyStackPath, "domain-info.txt");

  let jsonData;
  try {
    jsonData = parseToJSON(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return (
      <Detail markdown={`# Error reading customer data\n\n${error instanceof Error ? error.message : String(error)}`} />
    );
  }

  const results = findApiKey(customer, jsonData);

  if (!results.length) {
    return <Detail markdown={`# Customer not found: ${customer}`} />;
  }

  const customerData = results[0];
  const apiKey = customerData.key;

  const runPullDevData = async () => {
    setIsLoading(true);
    setError("");
    setOutput("🚀 Starting pull_dev_data.py...\n\n");

    return new Promise<void>((resolve) => {
      // Run the command from within the HockeyStack directory
      const child = spawn("/bin/zsh", ["-c", `./bin/pull_dev_data.py clone-mongo --account-api-keys="${apiKey}"`], {
        cwd: preferences.hockeyStackPath,
        env: {
          ...process.env,
          HOME: process.env.HOME,
          PATH: `${process.env.HOME}/.local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}`,
        },
      });

      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (data) => {
        const newData = data.toString();
        stdoutData += newData;
        setOutput(
          `📋 **Output:**\n\`\`\`\n${stdoutData}\`\`\`${stderrData ? `\n\n⚠️ **Stderr:**\n\`\`\`\n${stderrData}\`\`\`` : ""}`,
        );
      });

      child.stderr.on("data", (data) => {
        const newData = data.toString();
        stderrData += newData;
        setOutput(
          `📋 **Output:**\n\`\`\`\n${stdoutData}\`\`\`${stderrData ? `\n\n⚠️ **Stderr:**\n\`\`\`\n${stderrData}\`\`\`` : ""}`,
        );
      });

      child.on("close", (code) => {
        setIsLoading(false);
        if (code === 0) {
          setOutput(
            `✅ **Success!**\n\n📋 **Output:**\n\`\`\`\n${stdoutData}\`\`\`${stderrData ? `\n\n⚠️ **Stderr:**\n\`\`\`\n${stderrData}\`\`\`` : ""}`,
          );
        } else {
          setError(
            `❌ **Command Failed** (exit code: ${code})\n\n📋 **Output:**\n\`\`\`\n${stdoutData}\`\`\`\n\n⚠️ **Stderr:**\n\`\`\`\n${stderrData}\`\`\``,
          );
        }
        resolve();
      });

      child.on("error", (err) => {
        setIsLoading(false);
        setError(`❌ **Error starting command:**\n\`\`\`\n${err.message}\`\`\``);
        resolve();
      });
    });
  };

  let markdown = "";

  if (error) {
    markdown = error;
  } else if (output) {
    markdown = output;
  } else {
    markdown = `## Pull Dev Data - ${customerData.domain}\n\n**API Key:** ${apiKey}\n\n**Command:**\n\`\`\`\n./bin/pull_dev_data.py clone-mongo --account-api-keys="${apiKey}"\n\`\`\`\n\nPress **⏎** to run the command.`;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Run Pull Dev Data" onAction={runPullDevData} />
          <Action.CopyToClipboard title="Copy Api Key" content={apiKey} />
          <Action.CopyToClipboard
            title="Copy Command"
            content={`./bin/pull_dev_data.py clone-mongo --account-api-keys="${apiKey}"`}
          />
          {(output || error) && <Action.CopyToClipboard title="Copy Output" content={output || error} />}
        </ActionPanel>
      }
    />
  );
}
