import { Action, Icon } from "@raycast/api";

interface Props {
  showingDetail: boolean;
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ToggleViewAction = ({ showingDetail, setShowingDetail }: Props) => {
  return (
    <Action
      title={showingDetail ? "Show List View" : "Show Detailed View"}
      icon={showingDetail ? Icon.List : Icon.Text}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => setShowingDetail(!showingDetail)}
    />
  );
};
