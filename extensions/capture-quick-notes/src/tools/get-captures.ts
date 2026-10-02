import { listCaptures } from "../capture-cli";

type Input = {
  /** Text to search for in capture content, URLs, and list names. Omit to get the most recent captures. */
  query?: string;
  /** Only return captures in the list with this exact name. */
  list?: string;
  /** Include archived captures in the results. Defaults to false. */
  includeArchived?: boolean;
  /** Maximum number of captures to return. Defaults to 25. */
  limit?: number;
};

export default async function (input: Input) {
  return await listCaptures(
    input.query ?? "",
    input.limit ?? 25,
    input.list,
    input.includeArchived ?? false,
  );
}
