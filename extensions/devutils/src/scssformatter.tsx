import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://scssformatter?clipboard";
  open(url);
};
