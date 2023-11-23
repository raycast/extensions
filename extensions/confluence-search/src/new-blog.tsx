import "./util/fetchPolyfill";

import { open } from "@raycast/api";
import { authorizeSite } from "./api/auth";

export default async () => {
  const site = await authorizeSite(false); // no special scopes needed
  const link = new URL(
    `${site.url}/wiki/create-content/blog?spaceKey=&parentPageId=&withFallback=true&source=createBlankFabricPage`
  );
  await open(`${link}`);
};
