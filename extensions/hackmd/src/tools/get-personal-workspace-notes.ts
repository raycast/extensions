import api from "../lib/api";

export default async function tool() {
  return api.getNoteList().then(notes => notes.slice(0, 50));
}
