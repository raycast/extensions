import { Action, Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";

export type CopyWithRepromptActionProps = Omit<Action.Props, "onAction"> & {
  repromptDescription?: string;
  content: string;
};

function CopyWithRepromptAction(props: CopyWithRepromptActionProps) {
  const { repromptDescription, content, ...componentProps } = props;

  const copyContent = async () => {
    await Clipboard.copy(content);
    await showHUD("Copied to Clipboard");
    await closeMainWindow();
  };

  return <ActionWithReprompt {...componentProps} onAction={copyContent} repromptDescription={repromptDescription} />;
}

export default CopyWithRepromptAction;
