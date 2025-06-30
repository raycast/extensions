import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://lessformatter?clipboard";
  open(url);
};
