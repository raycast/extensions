import { Action } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useReprompt from "~/utils/hooks/useReprompt";

export type ActionWithRepromptProps = Omit<Action.Props, "onAction"> & {
  repromptDescription?: string;
  onAction: () => void | Promise<void>;
};

function ActionWithReprompt(props: ActionWithRepromptProps) {
  const { repromptDescription, onAction, ...componentProps } = props;
  const { reprompt } = useSelectedVaultItem();
  const repromptAndPerformAction = useReprompt(onAction, { description: repromptDescription });

  return <Action {...componentProps} onAction={reprompt ? repromptAndPerformAction : onAction} />;
}

export default ActionWithReprompt;
