import { useNavigation } from "@raycast/api";
import { useRef } from "react";
import RepromptForm from "~/components/RepromptForm";

export type UserRepromptActionProp = { password: string; closeForm: () => void };
export type UseRepromptAction = (props: UserRepromptActionProp) => boolean | Promise<boolean>;

export type UseRepromptOptions = {
  description?: string;
};

/**
 * Returns a function for an Action that will navigate to the {@link RepromptForm}.
 * The password is not confirm in this hook, only passed down to the action.
 */
function useReprompt(action: UseRepromptAction, options?: UseRepromptOptions) {
  const { description = "Performing this action" } = options ?? {};
  const { push, pop } = useNavigation();
  const wasPopped = useRef(false);

  async function handleConfirm(password: string) {
    await action({ password, closeForm });
    if (!wasPopped.current) pop();
  }

  function closeForm() {
    wasPopped.current = true;
    pop();
  }

  return () => {
    push(<RepromptForm description={description} onConfirm={handleConfirm} />);
  };
}

export default useReprompt;
