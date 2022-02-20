import { ImageLike, KeyboardShortcut, OpenInBrowserAction, popToRoot } from "@raycast/api";
import { getPreferPopToRootPreference } from "../common";

export function GitLabOpenInBrowserAction(props: {
  url: string;
  title?: string | undefined;
  shortcut?: KeyboardShortcut | undefined;
  icon?: ImageLike;
}): JSX.Element {
  const afterOpen = async () => {
    if (getPreferPopToRootPreference()) {
      await popToRoot();
    }
  };
  return (
    <OpenInBrowserAction
      url={props.url}
      title={props.title}
      shortcut={props.shortcut}
      onOpen={afterOpen}
      icon={props.icon}
    />
  );
}
