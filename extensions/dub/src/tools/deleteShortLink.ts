import { withAccessToken } from "@raycast/utils";
import { dubOAuth } from "../api/oauth";
import { deleteShortLink } from "../api";

async function deleteShortLinkTool(linkId: string) {
  await deleteShortLink(linkId);
}

export default withAccessToken(dubOAuth)(deleteShortLinkTool);
