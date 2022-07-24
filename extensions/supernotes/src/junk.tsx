import { open } from "@raycast/api";
import { SUPERNOTES_VIEW_URL } from "utils/defines";

export default async function junk() {
  await open(`${SUPERNOTES_VIEW_URL}/junk`);
}
