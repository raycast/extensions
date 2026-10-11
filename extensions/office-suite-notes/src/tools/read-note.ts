import { readNote } from "../lib/api";
type Input = {
  /** ID of the note obtained from Search Notes. */
  id: string;
};
export default async function tool(input: Input) {
  return (await readNote(input.id)).data;
}
