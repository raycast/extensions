import { Action, Icon } from "@raycast/api";

export const ClearRefreshAction = ({
  clearRefresh,
  setShow,
}: {
  clearRefresh: () => void;
  setShow: (v: boolean) => void;
}) => {
  const action = () => {
    setShow(false);
    clearRefresh();
  };
  return (
    <Action
      title="Clear Cache & Refresh"
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      icon={Icon.DeleteDocument}
      onAction={() => {
        action();
      }}
    />
  );
};

export const RefreshAction = ({ refresh }: { refresh: (v: string[]) => void }) => {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowCounterClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => {
        refresh(["all"]);
      }}
    />
  );
};

export const DeleteAction = ({ handle, id }: { handle: (id: string) => void; id: string }) => {
  return (
    <Action
      title="Delete"
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd"], key: "x" }}
      onAction={() => handle(id)}
      icon={Icon.Trash}
    />
  );
};
