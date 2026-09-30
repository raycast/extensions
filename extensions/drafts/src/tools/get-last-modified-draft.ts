import { getDrafts } from "../utils/get-drafts";

export default async function () {
  const drafts = await getDrafts();
  return drafts[0];
}
