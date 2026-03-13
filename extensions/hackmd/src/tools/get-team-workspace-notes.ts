import api from "../lib/api";
import { sortByLastChanged } from "../helpers/noteUtils";

type Input = {
  teamPath: string;
};

export default async function tool(input: Input) {
  return api.getTeamNotes(input.teamPath).then((notes) => notes.sort(sortByLastChanged).slice(0, 50));
}
