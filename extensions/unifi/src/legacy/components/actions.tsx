import { Action, Icon } from "@raycast/api";

export function ToggleDetailsAction(props: { showDetails?: boolean; setShowDetails?: (newValue: boolean) => void }) {
  if (props.showDetails === undefined || props.setShowDetails === undefined) {
    return null;
  }
  const handle = () => {
    if (props.setShowDetails) {
      props.setShowDetails(!props.showDetails);
    }
  };
  return (
    <Action
      title={props.showDetails ? "Hide Details" : "Show Details"}
      icon={props.showDetails ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={handle}
    />
  );
}

export function RevalidateAction(props: { revalidate: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.RotateAntiClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => props.revalidate}
    />
  );
}
