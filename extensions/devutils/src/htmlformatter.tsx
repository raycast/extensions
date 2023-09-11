import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://htmlformatter?clipboard";
  open(url);
};
