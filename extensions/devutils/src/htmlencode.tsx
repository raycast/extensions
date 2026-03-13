import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://htmlencode?clipboard";
  open(url);
};
