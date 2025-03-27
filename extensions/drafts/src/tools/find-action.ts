import { getAllActions } from "../utils/get-all-actions";

type Input = {
  /**
   * The search term for the action name.
   */
  searchTerm: string;
};

export default async function (input: Input) {
  let actions = await getAllActions();
  actions = actions.filter((action) => action.name === input.searchTerm);

  return actions;
}
