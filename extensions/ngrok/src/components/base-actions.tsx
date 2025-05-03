import { Action, Icon } from "@raycast/api";

type Props = {
  goToCreate: () => void;
  reload: () => void;
};

export default function BaseActions({ goToCreate, reload }: Props) {
  return (
    <>
      <Action
        icon={Icon.Plus}
        title="Create Tunnel"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={goToCreate}
      />
      <Action icon={Icon.ArrowClockwise} title="Reload List" onAction={reload} />
    </>
  );
}
