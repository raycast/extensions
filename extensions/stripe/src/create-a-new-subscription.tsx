import { open } from "@raycast/api";
import { QUICK_LINKS } from "@src/enums";

export default async () => {
  await open(QUICK_LINKS.NEW_SUBSCRIPTION);
};
