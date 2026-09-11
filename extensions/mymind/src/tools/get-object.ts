import { getObject } from "../api";
import { ObjectSummary, summarizeObject } from "./shared";

type Input = {
  /**
   * The id of the object to fetch. Get this from the results of the
   * search-mymind tool.
   */
  id: string;
};

/**
 * Fetch the full details of a single mymind object by id, including its note
 * body and any attached notes. Use this after search-mymind when you need the
 * complete content of an item.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const object = await getObject(input.id);
  return summarizeObject(object, { includeContent: true });
}
