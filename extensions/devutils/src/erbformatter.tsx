import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://erbformatter?clipboard";
  open(url);
};
