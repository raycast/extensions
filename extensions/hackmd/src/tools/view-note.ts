import api from "../lib/api";

type Input = {
  noteId: string;
};

export default async function tool(input: Input) {
  return api.getNote(input.noteId);
}
