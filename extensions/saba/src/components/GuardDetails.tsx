import { Action, ActionPanel, Detail } from "@raycast/api";

interface Props {
  title?: string;
  icon?: string;
  markdown?: string;
  onAction?: () => void;
}

export const GuardDetails = ({ title, icon, markdown, onAction }: Props) => {
  return (
    <Detail
      markdown={markdown}
      actions={
        <>
          {title && (
            <ActionPanel>
              <Action icon={icon} title={title} onAction={onAction} />
            </ActionPanel>
          )}
        </>
      }
    />
  );
};
