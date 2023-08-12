import { Action } from "@raycast/api";

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
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={handle}
    />
  );
}
