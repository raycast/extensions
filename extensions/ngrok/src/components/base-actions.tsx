import { Action } from "@raycast/api";

type Props = {
  goToCreate: () => void;
  reload: () => void;
};

export default function BaseActions({ goToCreate, reload }: Props) {
  return (
    <>
      <Action title="Create Tunnel" shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={goToCreate} />
      <Action title="Reload List" onAction={reload} />
    </>
  );
}
