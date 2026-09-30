import { createList } from "../capture-cli";

type Input = {
  /** The name of the list to create. */
  name: string;
};

export default async function (input: Input) {
  return await createList(input.name);
}
