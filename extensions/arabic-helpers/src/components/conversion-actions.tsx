import { Action, ActionPanel, Application, getFrontmostApplication, Icon, showToast, Toast } from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";

type TextVariant = {
  label: string;
  text: string;
};

type ConversionActionsProps = {
  primary: TextVariant;
  secondary: TextVariant;
  mainAction?: ReactNode;
  quickInputAction?: ReactNode;
  extraActions?: ReactNode;
  onClear: () => void;
};

export function ConversionActions({
  primary,
  secondary,
  mainAction,
  quickInputAction,
  extraActions,
  onClear,
}: ConversionActionsProps) {
  const [frontmostApplication, setFrontmostApplication] = useState<Application>();

  useEffect(() => {
    getFrontmostApplication().then(setFrontmostApplication).catch(console.error);
  }, []);

  const pasteTitle = frontmostApplication ? `Paste in ${frontmostApplication.name}` : "Paste in Active App";
  const pasteIcon = frontmostApplication ? { fileIcon: frontmostApplication.path } : Icon.Clipboard;

  if (primary.text.length === 0 && secondary.text.length === 0) {
    return (
      <ActionPanel>
        {mainAction}
        <Action
          title="Nothing to Copy"
          icon={Icon.Warning}
          onAction={() =>
            showToast({
              style: Toast.Style.Failure,
              title: "Nothing to copy",
              message: "Type or paste some text first.",
            })
          }
        />
        {quickInputAction}
        {extraActions ? <ActionPanel.Section>{extraActions}</ActionPanel.Section> : null}
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      {mainAction}
      <ActionPanel.Section title={primary.label}>
        <Action.CopyToClipboard title={`Copy ${primary.label}`} content={primary.text} />
        {quickInputAction}
        <Action.Paste title={pasteTitle} icon={pasteIcon} content={primary.text} />
      </ActionPanel.Section>
      <ActionPanel.Section title={secondary.label}>
        <Action.CopyToClipboard title={`Copy ${secondary.label}`} content={secondary.text} />
        <Action.Paste title={pasteTitle} icon={pasteIcon} content={secondary.text} />
      </ActionPanel.Section>
      {extraActions ? <ActionPanel.Section>{extraActions}</ActionPanel.Section> : null}
      <ActionPanel.Section>
        <Action title="Clear Both Areas" icon={Icon.Eraser} onAction={onClear} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
