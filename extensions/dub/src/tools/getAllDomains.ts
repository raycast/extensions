import { withAccessToken } from "@raycast/utils";
import { dubOAuth } from "../api/oauth";
import { getAllDomains } from "../api";

async function getAllDomainsTool() {
  const domains = await getAllDomains();
  return domains;
}

export default withAccessToken(dubOAuth)(getAllDomainsTool);
