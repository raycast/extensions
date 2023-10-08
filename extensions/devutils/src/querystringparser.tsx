import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://querystringparser?clipboard";
  open(url);
};
