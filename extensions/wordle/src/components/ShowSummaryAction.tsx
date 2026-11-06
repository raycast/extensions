import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import { Language } from "@src/types";
import { showErrorToast } from "@src/util";

type ShowSummaryActionProps = {
  language: Language;
};

export const ShowSummaryAction = ({ language }: ShowSummaryActionProps) => {
  const showSummary = async () => {
    try {
      await launchCommand({ name: "show_history", type: LaunchType.UserInitiated, context: { language } });
    } catch {
      await showErrorToast({ title: "Failed to show summary" });
    }
  };

  return <Action icon={Icon.AppWindowList} title="Show Summary" onAction={showSummary} />;
};
