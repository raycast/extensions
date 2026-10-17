import { pondClient } from "../api";

type Input = {
  /** Exact save ID returned by Search Library. */
  id: string;
  /** Library ID returned with the save. The same library must still be active. */
  libraryId: string;
};

export default async function GetSave(input: Input) {
  return pondClient().getSave(input);
}
