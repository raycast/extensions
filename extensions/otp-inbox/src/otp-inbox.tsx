import {
  Action,
  ActionPanel,
  getFrontmostApplication,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { Clipboard } from "@raycast/api";
import React from "react";
import { getEmails } from "./lib/gmail";
import { processEmails } from "./lib/utils";
import { ProcessedEmail } from "./lib/types";
import { LinkChooser } from "./components/link-chooser";
import { EmailDetail } from "./components/email-detail";
import AuthWrapper from "./components/auth-wrapper";
import { forgetPattern } from "./lib/learning";
import { isValidOtp } from "./lib/otp";

function VerificationActions({
  processed,
  frontmostApp,
  onForgetPattern,
  onRefresh,
}: {
  processed: ProcessedEmail;
  frontmostApp: string;
  onForgetPattern: () => void;
  onRefresh: () => void;
}) {
  const otp = isValidOtp(processed.otp) ? processed.otp : undefined;

  return (
    <ActionPanel>
      {otp && (
        <ActionPanel.Section title="Verification Code">
          <Action
            title={`Paste to ${frontmostApp}`}
            icon={{ source: Icon.Paperclip, tintColor: "#FFFFFF" }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              await Clipboard.paste(otp);
              await showHUD(`Pasted code to ${frontmostApp}`, { clearRootSearch: true });
            }}
          />
          <Action
            title="Copy Verification Code"
            icon={{ source: Icon.Clipboard }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(otp);
              await showHUD("Copied code to clipboard", { clearRootSearch: true });
            }}
          />
        </ActionPanel.Section>
      )}

      {processed.link && (
        <ActionPanel.Section title="Verification Link">
          <Action.OpenInBrowser
            url={processed.link.href}
            title="Open Verification Link"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            content={processed.link.href}
            title="Copy Verification Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          {processed.link.selectedBy === "learned-pattern" && processed.link.matchedPatternId && (
            <Action
              title="Forget Learned Link Pattern"
              icon={{ source: Icon.Trash }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={async () => {
                await forgetPattern(processed.link!.matchedPatternId!);
                onForgetPattern();
                await showToast({ style: Toast.Style.Success, title: "Forgot link pattern" });
              }}
            />
          )}
        </ActionPanel.Section>
      )}

      {processed.ambiguousLinks.length > 0 && (
        <ActionPanel.Section title="Verification Link">
          <Action.Push
            title="Choose Verification Link…"
            icon={{ source: Icon.List }}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={
              <LinkChooser
                candidates={processed.ambiguousLinks}
                sender={processed.sender}
                senderRegistrableDomain={processed.senderRegistrableDomain}
              />
            }
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Email">
        <Action.Push
          title="Show Email Content"
          icon={{ source: Icon.Text }}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<EmailDetail sender={processed.sender} emailText={processed.emailText} />}
        />
        <Action
          title="Refresh"
          icon={{ source: Icon.ArrowClockwise }}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
        <Action title="Open Extension Preferences" icon={{ source: Icon.Gear }} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function OTPInbox() {
  const [frontmostApp, setFrontmostApp] = React.useState<string>("active app");
  const [items, setItems] = React.useState<ProcessedEmail[] | null>(null);
  const [, setForceRender] = React.useState(0);

  async function load() {
    setItems(null);
    try {
      const app = await getFrontmostApplication();
      setFrontmostApp(app.name);
      const emails = await getEmails();
      const { recentEmails, verificationCodes } = await processEmails(emails);
      setItems([...verificationCodes, ...recentEmails]);
    } catch (error) {
      console.error("Failed to load OTP Inbox", error);
      setItems([]);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <AuthWrapper>
      <List isLoading={items === null}>
        {items?.map((processed, idx) => (
          <List.Item
            key={`${processed.receivedAt.toISOString()}-${processed.sender.email}-${idx}`}
            title={processed.sender.name}
            subtitle={processed.sender.email}
            accessories={[
              {
                tag: processed.otp
                  ? getPreferenceValues().hideVerificationCodes
                    ? "•".repeat(processed.otp.length)
                    : processed.otp
                  : processed.link
                    ? "Link"
                    : processed.ambiguousLinks.length > 0
                      ? "Choose…"
                      : "No code/link",
              },
              { date: processed.receivedAt },
            ]}
            actions={
              <VerificationActions
                processed={processed}
                frontmostApp={frontmostApp}
                onForgetPattern={() => setForceRender((v) => v + 1)}
                onRefresh={load}
              />
            }
          />
        ))}
        <List.EmptyView
          title="No Verification Codes Found"
          description="No verification codes found from the last 10 minutes. Try refreshing."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={{ source: Icon.ArrowClockwise }} onAction={load} />
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
