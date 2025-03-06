import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://colortools?clipboard";
  open(url);
};
