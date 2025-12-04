import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://cssformatter?clipboard";
  open(url);
};
