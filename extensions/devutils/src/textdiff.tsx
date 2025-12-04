import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://textdiff?clipboard";
  open(url);
};
