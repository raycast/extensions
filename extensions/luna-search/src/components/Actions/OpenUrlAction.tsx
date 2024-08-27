import { Action, Image } from "@raycast/api";
import { openUrl } from "../../utilities";

/**
 * Defines the shape of the props for the OpenUrlAction component.
 */
interface Props {
  /**
   * The icon to display for the action.
   */
  icon: Image.ImageLike | undefined | null;

  /**
   * The title to display for the action.
   */
  title: string;

  /**
   * The URL to open when the action is triggered.
   */
  url: string;

  /**
   * Am optional callback to trigger when the action executes.
   */
  onAction?: () => void;
}

/**
 * A React component that renders an Action with the provided props.
 * When the action is triggered, it opens the specified URL in the target browser application.
 *
 * @param props The props for the component, including an optional icon, a title, and a URL to open.
 * @returns A JSX.Element representing the OpenUrlAction component.
 */
export function OpenUrlAction({ icon, onAction, title, url }: Props): JSX.Element {
  return (
    <Action
      title={title}
      icon={icon}
      onAction={async () => {
        await openUrl(url);
        if (onAction) onAction();
      }}
    />
  );
}
