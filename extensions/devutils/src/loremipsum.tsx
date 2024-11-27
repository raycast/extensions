import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://loremipsum?clipboard";
  open(url);
};
