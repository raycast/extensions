import { Action, Clipboard, closeMainWindow } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { Item, Reprompt } from "~/types/search";

export type CopyWithRepromptActionProps = Omit<Action.Props, "onAction"> & {
  item: Item;
  content: string;
};

function CopyWithRepromptAction(props: CopyWithRepromptActionProps) {
  const { item, content, ...componentProps } = props;

  const copyContent = async () => {
    await Clipboard.copy(content);
    await closeMainWindow();
  };

  return (
    <ActionWithReprompt
      {...componentProps}
      itemId={item.id}
      onAction={copyContent}
      reprompt={item.reprompt === Reprompt.REQUIRED}
      repromptDescription={componentProps.title}
    />
  );
}

export default CopyWithRepromptAction;
