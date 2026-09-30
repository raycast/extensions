import { Action, Icon } from "@raycast/api";

export default function CancelAction({ onCancel }: { onCancel: () => void }) {
  return <Action title="Cancel Run" icon={Icon.XMarkCircle} style={Action.Style.Destructive} onAction={onCancel} />;
}
