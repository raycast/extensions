import { open } from "@raycast/api";
import { pondClient } from "../api";

type Input = {
  /** Exact save ID returned by Search Library. */
  id: string;
  /** Library ID returned with the save. */
  libraryId: string;
};

export default async function OpenSave(input: Input) {
  const save = await pondClient().getSave(input);
  await open(save.pondUrl);
  return { opened: true, id: save.id, title: save.title, pondUrl: save.pondUrl };
}
