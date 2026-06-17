import { getAllActions } from "../utils/get-all-actions";

type Input = {
  /**
   * The search term for the action name.
   */
  searchTerm: string;
};

export default async function (input: Input) {
  const actions = await getAllActions();
  const filteredActions = actions.filter((action) => action.name === input.searchTerm);

  return filteredActions;
}
