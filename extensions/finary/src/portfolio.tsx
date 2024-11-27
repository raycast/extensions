import { open } from "@raycast/api";

import { Links } from "./types";
import { FINARY_WEBAPP } from "./constants";

export default async function Command() {
  open(`${FINARY_WEBAPP}/${Links.portfolio}`);
}
