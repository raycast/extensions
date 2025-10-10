import { OpenWithAction } from "@raycast/api";

import { IconConstants } from "Const";

type Props = {
  path: string;
  onSetup: () => void;
};

export function SetupActionItem({ path, onSetup }: Props): JSX.Element {
  return (
    <OpenWithAction icon={IconConstants.Setup} title="Configure Script Command with" path={path} onOpen={onSetup} />
  );
}
