import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://regextester?clipboard";
  open(url);
};
