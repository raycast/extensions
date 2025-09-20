import api from "../lib/api";
import { sortByLastChanged } from "../helpers/noteUtils";

export default async function () {
  return api.getHistory().then((notes) => notes.sort(sortByLastChanged));
}
