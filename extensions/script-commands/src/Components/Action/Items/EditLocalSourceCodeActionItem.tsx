import { OpenWithAction } from "@raycast/api";

import { IconConstants } from "Const";

type Props = {
  path: string;
  onSetup: () => void;
};

export function EditLocalSourceCodeActionItem({ path, onSetup }: Props): JSX.Element {
  return (
    <OpenWithAction
      icon={IconConstants.LocalSourceCode}
      title="Edit Local Source Code with"
      path={path}
      onOpen={onSetup}
    />
  );
}
