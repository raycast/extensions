import { List, Icon, Color, ActionPanel, Action, Clipboard, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getMolePathSafe, MOLE_ENV } from "./utils/mole";
import { stripAnsi } from "./utils/parsers";

function useTouchIdStatus(molePath: string) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const check = useCallback(() => {
    setIsLoading(true);
    execFile(molePath, ["touchid", "status"], { env: MOLE_ENV }, (_err, stdout, stderr) => {
      const output = stripAnsi((stdout || "") + (stderr || "")).toLowerCase();
      const isEnabled =
        (output.includes("enabled") || output.includes("is configured")) &&
        !output.includes("not configured") &&
        !output.includes("not currently enabled");
      setEnabled(isEnabled);
      setIsLoading(false);
    });
  }, [molePath]);

  useEffect(() => {
    check();
  }, [check]);

  return { enabled, isLoading, recheck: check };
}

export default function TouchIdForSudo() {
  const molePath = useMemo(() => getMolePathSafe(), []);

  if (!molePath) {
    return (
      <List>
        <List.EmptyView
          title="Mole Not Installed"
          description="Install Mole to use this extension: brew install mole"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return <TouchIdView molePath={molePath} />;
}

function TouchIdView({ molePath }: { molePath: string }) {
  const { enabled, isLoading, recheck } = useTouchIdStatus(molePath);

  const command = enabled ? "mo touchid disable" : "mo touchid enable";

  return (
    <List isLoading={isLoading} isShowingDetail>
      {enabled !== null && (
        <List.Item
          title="Touch ID for Sudo"
          icon={
            enabled
              ? { source: Icon.Fingerprint, tintColor: Color.Green }
              : { source: Icon.Fingerprint, tintColor: Color.Red }
          }
          accessories={[
            {
              tag: {
                value: enabled ? "Enabled" : "Disabled",
                color: enabled ? Color.Green : Color.Red,
              },
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={enabled ? "Enabled" : "Disabled"}
                      color={enabled ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={enabled ? "Touch ID is active for sudo commands" : "Password is required for sudo commands"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="To Toggle" text="Run in Terminal:" />
                  <List.Item.Detail.Metadata.Label title="Command" text={command} />
                  <List.Item.Detail.Metadata.Label title="Why Terminal?" text="macOS SIP protects /etc/pam.d" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Run in Terminal"
                icon={Icon.Terminal}
                onAction={async () => {
                  execFile(
                    "/usr/bin/osascript",
                    [
                      "-e",
                      `tell application "Terminal" to do script "${command}"`,
                      "-e",
                      `tell application "Terminal" to activate`,
                    ],
                    () => {},
                  );
                }}
              />
              <Action
                title="Copy Command"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(command);
                  await showHUD(`Copied: ${command}`);
                }}
              />
              <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={recheck} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
