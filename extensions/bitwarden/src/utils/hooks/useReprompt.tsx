import { showToast, Toast, useNavigation } from "@raycast/api";
import RepromptForm from "~/components/RepromptForm";
import { useSession } from "~/context/session";

export type UserRepromptActionProp = { closeForm: () => void };
export type UseRepromptAction = (props: UserRepromptActionProp) => boolean | Promise<boolean>;

export type UseRepromptOptions = {
  description?: string;
};

/**
 * Returns a function for an Action that will navigate to the {@link RepromptForm}.
 * The password is not confirm in this hook, only passed down to the action.
 */
function useReprompt(action: () => void | Promise<void>, options?: UseRepromptOptions) {
  const { description = "Performing an action that requires the master password" } = options ?? {};
  const session = useSession();
  const { push, pop } = useNavigation();

  async function handleConfirm(password: string) {
    const isPasswordCorrect = await session.confirmMasterPassword(password);
    if (!isPasswordCorrect) {
      await showToast(Toast.Style.Failure, "Failed to unlock vault", "Check your credentials");
      return;
    }
    pop();

    /* using a setTimeout here fixes a bug where the RepromptForm flashes when you pop back to the previous screen. 
    This comes with the trade-off of a tiny visible delay between the RepromptForm pop and the action pushing a new screen */
    setTimeout(action, 1);
  }

  return () => push(<RepromptForm description={description} onConfirm={handleConfirm} />);
}

export default useReprompt;
