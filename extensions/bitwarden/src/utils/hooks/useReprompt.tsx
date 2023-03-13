import { useNavigation } from "@raycast/api";
import RepromptForm from "~/components/RepromptForm";
import { useSession } from "~/context/session";
import { Item } from "~/types/vault";

export type UseRepromptOptions = {
  item?: Item;
  what?: string;
};

/**
 * Returns a function for an Action that will navigate to a master password confirmation form.
 * If the confirmation is successful, the provided action will be performed.
 *
 * @param session The session instance.
 * @param action The action to perform upon confirmation.
 * @param options Options for the form.
 */
function useReprompt(action: () => void, options: UseRepromptOptions) {
  const session = useSession();
  const { push, pop } = useNavigation();
  const { item, what } = options ?? {};

  const description = `Confirmation required${action == null ? "" : ` to ${what}`}${
    item == null ? "." : ` for ${item.name}.`
  }`;

  const handleConfirm = () => {
    pop();
    action();
  };

  return () => {
    push(<RepromptForm session={session} description={description} onConfirm={handleConfirm} />);
  };
}

export default useReprompt;
