import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://unixtime?clipboard";
  open(url);
};
