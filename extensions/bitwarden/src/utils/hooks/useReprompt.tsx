import { useNavigation } from "@raycast/api";
import { Session } from "~/api/session";
import { RepromptForm } from "~/components/RepromptForm";
import { Item } from "~/types/search";

/**
 * Returns a function for an {@link Action} that will navigate to a master password confirmation form.
 * If the confirmation is successful, the provided action will be performed.
 *
 * @param session The session instance.
 * @param action The action to perform upon confirmation.
 * @param options Options for the form.
 */
function useReprompt(
  session: Session,
  action: () => void,
  options: {
    item?: Item;
    what?: string;
  }
): () => void {
  const { push, pop } = useNavigation();
  const { item, what } = options ?? {};

  const description = `Confirmation required${action == null ? "" : ` to ${what}`}${
    item == null ? "." : ` for ${item.name}.`
  }`;

  return () => {
    if (session.canRepromptBeSkipped()) {
      action();
      return;
    }

    push(
      <RepromptForm
        session={session}
        description={description}
        onConfirm={() => {
          pop();
          action();
        }}
      />
    );
  };
}

export default useReprompt;
