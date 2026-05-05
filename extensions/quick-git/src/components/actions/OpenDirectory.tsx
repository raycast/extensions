import { Action, Icon, Keyboard } from "@raycast/api";

interface Props {
  path: string;
}

export function OpenDirectory({ path }: Props) {
  return <Action.OpenWith icon={Icon.Finder} path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />;
}
