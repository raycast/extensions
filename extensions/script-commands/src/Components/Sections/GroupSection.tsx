import { List } from "@raycast/api";

import { ScriptCommandItem } from "@components";

import { CompactGroup } from "@models";

type Props = {
  group: CompactGroup;
  onInstallPackage: (group: CompactGroup) => void;
};

export function GroupSection({ group, onInstallPackage }: Props): JSX.Element {
  const handleInstallPackage = () => onInstallPackage(group);

  return (
    <List.Section
      key={group.identifier}
      title={group.title}
      subtitle={group.subtitle}
      children={group.scriptCommands.map((scriptCommand) => (
        <ScriptCommandItem
          key={scriptCommand.identifier}
          scriptCommand={scriptCommand}
          group={group}
          onInstallPackage={handleInstallPackage}
        />
      ))}
    />
  );
}
