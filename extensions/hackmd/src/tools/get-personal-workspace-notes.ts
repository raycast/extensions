import api from "../lib/api";
import { sortByLastChanged } from "../helpers/noteUtils";

export default async function tool() {
  return api.getNoteList().then((notes) => notes.sort(sortByLastChanged).slice(0, 50));
}
