import {
  ActionPanel,
  List,
  Action,
  Color,
  Icon,
  getFrontmostApplication,
  openExtensionPreferences,
  getPreferenceValues,
  Detail,
} from "@raycast/api";
import { Clipboard, showHUD } from "@raycast/api";
import { getEmails } from "./lib/gmail";
import { processEmails } from "./lib/utils";
import { VerificationCode } from "./lib/types";
import AuthWrapper from "./components/auth-wrapper";
import React from "react";

export default function OTPInbox() {
  const [frontmostApp, setFrontmostApp] = React.useState<string>("");
  const [verificationCodes, setVerificationCodes] = React.useState<VerificationCode[] | null>(null);
  const [recentEmails, setRecentEmails] = React.useState<VerificationCode[]>([]);

  async function getVerificationCodes() {
    // Set states
    setVerificationCodes(null);
    setRecentEmails([]);

    // Get the emails
    const emails = await getEmails();

    // Process emails
    const { recentEmails, verificationCodes } = processEmails(emails);

    // Set states
    setRecentEmails(recentEmails);
    setVerificationCodes(verificationCodes);
  }

  React.useEffect(() => {
    (async () => {
      try {
        // Set the frontmost app
        setFrontmostApp((await getFrontmostApplication()).name);

        // Get verification codes
        await getVerificationCodes();
      } catch (error) {
        console.error("Failed to get verification codes", error);
      }
    })();
  }, []);

  return (
    <AuthWrapper>
      <List isLoading={verificationCodes === null}>
        <List.Section title="Verification Codes">
          {verificationCodes?.map((code) => (
            <List.Item
              key={code.receivedAt.toISOString()}
              title={code.sender.name}
              subtitle={code.sender.email}
              accessories={[
                {
                  tag: getPreferenceValues().hideVerificationCodes
                    ? "•".repeat(code.code?.replace(/[\s-]/g, "").length || 0)
                    : code.code,
                },
                {
                  date: code.receivedAt,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Paste to ${frontmostApp}`}
                    icon={{ source: Icon.Paperclip, tintColor: Color.PrimaryText }}
                    onAction={async () => {
                      const app = await getFrontmostApplication();
                      await Clipboard.paste(code.code!);
                      await showHUD(`Pasted code for ${code.sender.name} to ${app.name}`, { clearRootSearch: true });
                    }}
                  />
                  <Action
                    title={`Copy to Clipboard`}
                    icon={{ source: Icon.Clipboard }}
                    onAction={async () => {
                      await Clipboard.copy(code.code!);
                      await showHUD(`Copied code for ${code.sender.name} to clipboard`, { clearRootSearch: true });
                    }}
                  />
                  <Action.Push
                    title="Show Email Content"
                    icon={{ source: Icon.Text }}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<Detail markdown={`### Email from ${code.sender.name}\n\n${code.emailText}`} />}
                  />
                  <Action
                    title="Refresh"
                    icon={{ source: Icon.ArrowClockwise }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      await getVerificationCodes();
                    }}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={{ source: Icon.Gear }}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        <List.Section title="Recent Emails">
          {recentEmails.map((email) => (
            <List.Item
              key={email.receivedAt.toISOString()}
              title={email.sender.name}
              subtitle={email.sender.email}
              accessories={[
                {
                  date: email.receivedAt,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Email Content"
                    icon={{ source: Icon.Text }}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<Detail markdown={`### Email from ${email.sender.name}\n\n${email.emailText}`} />}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={{ source: Icon.Gear }}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        <List.EmptyView
          title="No Verification Codes Found"
          description="No verification codes found from the last 10 minutes. Try refreshing."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={{ source: Icon.ArrowClockwise }}
                onAction={async () => {
                  await getVerificationCodes();
                }}
              />
              <Action
                title="Open Extension Preferences"
                icon={{ source: Icon.Gear }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    </AuthWrapper>
  );
}
