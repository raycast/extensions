import { Action, showToast, Toast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/search/context/vaultItem";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import useReprompt, { UserRepromptActionProp } from "~/utils/hooks/useReprompt";

export type ActionWithRepromptProps = Omit<Action.Props, "onAction"> & {
  repromptDescription?: string;
  onAction: () => void | Promise<void>;
};

function ActionWithReprompt(props: ActionWithRepromptProps) {
  const { id, reprompt } = useSelectedVaultItem();
  const { repromptDescription, onAction, ...componentProps } = props;

  const bitwarden = useBitwarden();
  const session = useSession();
  const repromptAndPerformAction = useReprompt(performAction, { description: repromptDescription });

  async function performAction({ password, closeForm }: UserRepromptActionProp) {
    const toast = await showToast(Toast.Style.Animated, "Confirming...");
    try {
      const vaultItem = await bitwarden.getItem(id, session.token!, { password });
      if (!vaultItem) throw new Error("Couldn't get item.");
      closeForm();
      await onAction?.();
      await toast.hide();
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't get password.";
      toast.message = "Check your credentials";
      return false;
    }
  }

  return <Action {...componentProps} onAction={reprompt ? repromptAndPerformAction : onAction} />;
}

export default ActionWithReprompt;
