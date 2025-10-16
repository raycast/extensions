import { open } from "@raycast/api";
import { QUICK_LINKS } from "./enums";

export default async () => {
  await open(QUICK_LINKS.NEW_PRODUCT);
};
