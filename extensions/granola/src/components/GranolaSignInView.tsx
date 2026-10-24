import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { diagnosticReport } from "../utils/diagnostics";

export type SignInProblem = "declined" | "expired" | "connection" | "unknown";
export interface SignInViewProps {
  checking?: boolean;
  busy?: boolean;
  code?: string;
  url?: string;
  problem?: SignInProblem;
  onSignIn: () => void | Promise<void>;
  onCancel: () => void;
}

const illustration = { source: { light: "sign-in-illustration.png", dark: "sign-in-illustration@dark.png" } };

const problems = {
  declined: {
    title: "Sign-in declined",
    description: "No access was granted.\nYou can try again whenever you're ready.",
    action: "Try Again",
    icon: Icon.Person,
  },
  expired: {
    title: "Your code expired",
    description: "Get a new code to finish connecting Granola.",
    action: "Get New Code",
    icon: Icon.Clock,
  },
  connection: {
    title: "Couldn't connect to Granola",
    description: "Check your connection and try again.",
    action: "Try Again",
    icon: Icon.Wifi,
  },
  unknown: {
    title: "Couldn't finish signing in",
    description: "Try again, or copy diagnostics for help.",
    action: "Try Again",
    icon: Icon.ExclamationMark,
  },
};

export function GranolaSignInView({ checking, busy, code, url, problem, onSignIn, onCancel }: SignInViewProps) {
  const error = problem ? problems[problem] : undefined;
  if (checking) return <List isLoading searchBarPlaceholder="Connecting to Granola…" />;
  return (
    <List
      filtering={false}
      searchBarPlaceholder={busy ? "Waiting for browser approval…" : "Connect your Granola account"}
    >
      <List.EmptyView
        icon={error?.icon ?? illustration}
        title={error?.title ?? (busy ? (code ? `Confirm ${code}` : "Opening your browser…") : "Sign in to Granola")}
        description={
          error?.description ??
          (busy
            ? "Approve access in your browser.\nYour notes will appear here automatically."
            : "Your notes and transcripts, right in Raycast.\nSign in once to get started.")
        }
        actions={
          <ActionPanel>
            {busy ? (
              url && <Action.OpenInBrowser title="Continue in Browser" url={url} />
            ) : (
              <Action title={error?.action ?? "Sign in to Granola"} icon={Icon.ArrowRight} onAction={onSignIn} />
            )}
            {busy && code && <Action.CopyToClipboard title="Copy Confirmation Code" content={code} />}
            {busy && (
              <Action
                title="Cancel Sign-in"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={onCancel}
              />
            )}
            {error && (
              <Action
                title="Copy Diagnostics"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(await diagnosticReport());
                  await showToast({ style: Toast.Style.Success, title: "Diagnostics Copied" });
                }}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
