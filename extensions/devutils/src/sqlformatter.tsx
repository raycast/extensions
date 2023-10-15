import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://sqlformatter?clipboard";
  open(url);
};
