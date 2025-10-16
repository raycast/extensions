import { Action, Icon } from "@raycast/api";

export const ContributeAction = () => {
  return (
    <Action.OpenInBrowser
      title="Contribute Cursor Rule"
      icon={Icon.Leaf}
      url={`https://github.com/pontusab/cursor.directory/`}
    />
  );
};
