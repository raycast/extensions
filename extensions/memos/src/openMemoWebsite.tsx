import { open } from "@raycast/api";
import { getOriginUrl } from "./api";

export default async function Main() {
  const url = getOriginUrl();

  open(url);
}
