import { addToReadingList } from "../safari";

type Input = {
  /**
   * The URL to add to the reading list.
   */
  url: string;
};

export default async function tool(input: Input) {
  await addToReadingList(input.url);
}
