import {
  Action,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { SearchMode } from "../types";
import { CustomProjectsForm } from "./CustomProjectsForm";

interface ConfigureProjectsActionProps {
  customProjects: string;
  onProjectsChange: (value: string) => void;
}

export function ConfigureProjectsAction({
  customProjects,
  onProjectsChange,
}: ConfigureProjectsActionProps) {
  const { push } = useNavigation();

  return (
    <Action
      title="Configure Custom Projects"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={() =>
        push(
          <CustomProjectsForm
            initialValue={customProjects}
            onSave={async (value) => {
              onProjectsChange(value);
              await LocalStorage.setItem("custom-projects", value);
              await showToast({
                style: Toast.Style.Success,
                title: "Configuration Saved",
              });
            }}
          />,
        )
      }
    />
  );
}

interface SwitchModeActionProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => Promise<void>;
}

export function SwitchModeAction({
  currentMode,
  onModeChange,
}: SwitchModeActionProps) {
  const nextMode = (current: SearchMode): SearchMode => {
    if (current === "quick") return "full";
    if (current === "full") return "custom";
    return "quick";
  };

  const getModeLabel = (mode: SearchMode) => {
    switch (mode) {
      case "quick":
        return "Quick";
      case "full":
        return "Detailed";
      case "custom":
        return "Custom";
      default:
        return mode;
    }
  };

  const cycleSearchMode = async () => {
    const next = nextMode(currentMode);
    await onModeChange(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Switched to ${getModeLabel(next)} mode`,
    });
  };

  const nextModeLabel = getModeLabel(nextMode(currentMode));

  return (
    <Action
      title={`Switch Mode to ${nextModeLabel}`}
      icon={Icon.ArrowRight}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={cycleSearchMode}
    />
  );
}
