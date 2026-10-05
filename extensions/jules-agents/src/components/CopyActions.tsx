import { Action, Icon, Keyboard } from "@raycast/api";
import { Plan } from "../types";
import { formatPlanToMarkdown } from "../utils";

export function CopyUrlAction({ url, title = "Copy URL" }: { url: string; title?: string }) {
  return (
    <Action.CopyToClipboard
      title={title}
      content={url}
      shortcut={Keyboard.Shortcut.Common.Copy}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyIdAction({ id, title = "Copy ID" }: { id: string; title?: string }) {
  return (
    <Action.CopyToClipboard
      title={title}
      content={id}
      shortcut={Keyboard.Shortcut.Common.CopyName}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyPromptAction({ prompt }: { prompt: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Prompt"
      content={prompt}
      shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyPrUrlAction({ url }: { url: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy PR URL"
      content={url}
      shortcut={{ modifiers: ["cmd", "opt"], key: "u" }}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyPlanMarkdownAction({ plan, title = "Copy Plan as Markdown" }: { plan: Plan; title?: string }) {
  return (
    <Action.CopyToClipboard
      title={title}
      content={formatPlanToMarkdown(plan)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyMessageAction({ content }: { content: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Message"
      content={content}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyActivityLogAction({ content }: { content: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Activity Log"
      content={content}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopySummaryAction({ content }: { content: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Summary"
      content={content}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      icon={Icon.CopyClipboard}
    />
  );
}

export function CopyStepDescriptionAction({ content }: { content: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Step Description"
      content={content}
      shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
      icon={Icon.CopyClipboard}
    />
  );
}
