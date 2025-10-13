import { withAccessToken } from "@raycast/utils";
import { dubOAuth } from "../api/oauth";
import { getAllShortLinks } from "../api";

async function getAllShortLinksTool() {
  const shortLinks = await getAllShortLinks();
  return shortLinks;
}

export default withAccessToken(dubOAuth)(getAllShortLinksTool);
