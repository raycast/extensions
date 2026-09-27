import { listFolders } from "../lib/api";
type Input = {
  /** Parent folder ID. Omit to list root folders. */
  parentId?: string;
};
export default async function tool(input: Input) {
  return (await listFolders(input.parentId)).data;
}
