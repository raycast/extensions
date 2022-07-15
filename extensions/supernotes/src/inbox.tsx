import { open } from "@raycast/api";
import { SUPERNOTES_VIEW_URL } from "utils/defines";

export default async function inbox () {
    await open(`${SUPERNOTES_VIEW_URL}/inbox`);
}
