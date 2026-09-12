import { withAccessToken } from "@raycast/utils";
import { dubOAuth } from "../api/oauth";
import { getAllTags } from "../api";

async function getAllTagsTool() {
  const tags = await getAllTags();
  return tags;
}

export default withAccessToken(dubOAuth)(getAllTagsTool);
