import { Action, ActionPanel, Clipboard, Icon, Image, List, Toast, environment, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
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

// Raycast renders SVG empty-state illustrations at 128px. Embed the existing
// brand asset with padding for a 96px mark, without changing the Store icon.
let illustration: Promise<Image.Source> | undefined;
function getIllustration() {
  const wrap = (bytes: Buffer) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><image x="16" y="16" width="96" height="96" href="data:image/png;base64,${bytes.toString("base64")}"/></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  };
  illustration ??= Promise.all([
    readFile(path.join(environment.assetsPath, "extension-icon.png")),
    readFile(path.join(environment.assetsPath, "extension-icon@dark.png")),
  ]).then(([light, dark]) => ({ light: wrap(light), dark: wrap(dark) }));
  return illustration;
}

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
  const [icon, setIcon] = useState<Image.Source>();
  useEffect(() => {
    let mounted = true;
    getIllustration()
      .then((value) => {
        if (mounted) setIcon(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const error = problem ? problems[problem] : undefined;
  if (checking) return <List isLoading searchBarPlaceholder="Connecting to Granola…" />;
  return (
    <List
      filtering={false}
      searchBarPlaceholder={busy ? "Waiting for browser approval…" : "Connect your Granola account"}
    >
      <List.EmptyView
        icon={error?.icon ?? (icon ? { source: icon } : Icon.Person)}
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
