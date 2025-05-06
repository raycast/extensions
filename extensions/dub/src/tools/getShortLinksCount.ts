import { withAccessToken } from "@raycast/utils";
import { dubOAuth } from "../api/oauth";
import { getShortLinksCount } from "../api";

async function getShortLinksCountTool(search?: string) {
  const count = await getShortLinksCount(search);
  return count;
}

export default withAccessToken(dubOAuth)(getShortLinksCountTool);
