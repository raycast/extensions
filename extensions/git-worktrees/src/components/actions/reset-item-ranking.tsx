import { getPreferences } from "#/helpers/raycast";
import { Action, Icon } from "@raycast/api";

export const ResetRanking = ({ title, resetRanking }: { title: string; resetRanking?: () => void }) => {
  const { enableProjectsFrequencySorting } = getPreferences();

  if (!enableProjectsFrequencySorting) return null;

  return <Action title={title} icon={Icon.ArrowCounterClockwise} onAction={resetRanking} />;
};
