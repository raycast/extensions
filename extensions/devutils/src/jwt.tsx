import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://jwt?clipboard";
  open(url);
};
