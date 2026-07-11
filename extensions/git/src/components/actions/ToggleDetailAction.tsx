import { Action, Icon, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export type ToggleDetailController = {
  title: string;
  isShowingDetail: boolean;
  toggleDetail: () => void;
};

export function useToggleDetail(id: string, title: string, initialValue: boolean = false): ToggleDetailController {
  const [isShowingDetail, setIsShowingDetail] = useCachedState(`toggle-detail:${id}`, initialValue);

  const toggleDetail = () => {
    setIsShowingDetail(!isShowingDetail);
  };

  return { title, isShowingDetail, toggleDetail };
}

export function ToggleDetailAction({
  controller,
  shortcut,
}: {
  controller: ToggleDetailController;
  shortcut?: Keyboard.Shortcut | undefined | null;
}) {
  return (
    <Action
      title={controller.isShowingDetail ? `Hide ${controller.title}` : `Show ${controller.title}`}
      icon={Icon.AppWindowSidebarLeft}
      onAction={controller.toggleDetail}
      shortcut={shortcut || { modifiers: ["cmd", "shift"], key: "d" }}
    />
  );
}
