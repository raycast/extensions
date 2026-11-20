import { Action, Icon } from "@raycast/api";

import type { NavigableView } from "../api/types";
import { QuickAddTask } from "../quick-add-task";

interface QuickAddActionProps {
  fallbackView?: NavigableView;
  initialValue?: string;
  onCreated?: () => void;
  title?: string;
}

export const QuickAddAction = ({
  fallbackView = "inbox",
  initialValue,
  onCreated,
  title = "Create Task",
}: QuickAddActionProps) => (
  <Action.Push
    icon={Icon.Stars}
    shortcut={{ key: "n", modifiers: ["cmd"] }}
    target={<QuickAddTask fallbackView={fallbackView} initialValue={initialValue} onCreated={onCreated} />}
    title={title}
  />
);
