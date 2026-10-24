import { selectBackgroundMusicByName } from "../ai-selection";

type Input = {
  /**
   * The name of an existing Elsewhere background-music track to select.
   * Use the name the user provides. Never invent a name or guess between choices.
   */
  name: string;
};

export default async function switchBackgroundMusic({ name }: Input) {
  return selectBackgroundMusicByName(name);
}
