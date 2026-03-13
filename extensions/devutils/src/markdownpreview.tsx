import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://markdownpreview?clipboard";
  open(url);
};
