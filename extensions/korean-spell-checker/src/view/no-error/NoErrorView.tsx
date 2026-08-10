import { List, Icon, Action, ActionPanel } from "@raycast/api";

interface NoErrorViewProps {
  text: string;
}

export default function NoErrorView({ text }: NoErrorViewProps) {
  return (
    <List.EmptyView
      title="Great, we didn't detect any errors in your input."
      description="Just a reminder that our system may not be able to catch every error, so it's always a good idea to double-check your work before submitting"
      icon={{ source: Icon.Checkmark, tintColor: { light: "#68ea54", dark: "#306a27", adjustContrast: true } }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Original Text"
            content={text}
            shortcut={{ modifiers: ["shift"], key: "c" }}
          />

          <Action.OpenInBrowser
            title="Open in Twitter"
            icon="twitter.png"
            url={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
            shortcut={{ modifiers: ["ctrl"], key: "t" }}
          />
        </ActionPanel>
      }
    />
  );
}
