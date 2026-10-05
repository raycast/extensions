import { selectSpaceByName } from "../ai-selection";

type Input = {
  /**
   * The name of an existing Elsewhere spatial soundscape to switch to.
   * Use the name the user provides. Never invent a name or guess between choices.
   */
  name: string;
};

export default async function switchSpace({ name }: Input) {
  return selectSpaceByName(name);
}
