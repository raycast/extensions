import { Action } from "@raycast/api";

interface IListActionsProps {
  onNextAction?: () => void;
  onPreviousAction?: () => void;
  onHomeAction: () => void;
}

export const ListActions = ({ onNextAction, onPreviousAction, onHomeAction }: IListActionsProps) => (
  <>
    {onNextAction && (
      <Action
        icon={"➡️"}
        title="Next Page"
        onAction={onNextAction}
        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
      />
    )}
    {onPreviousAction && (
      <>
        <Action
          icon={"⬅️"}
          title="Previous Page"
          onAction={onPreviousAction}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
        />
        <Action icon={"🏠"} title="Back to Home" onAction={onHomeAction} shortcut={{ modifiers: ["cmd"], key: "0" }} />
      </>
    )}
  </>
);
