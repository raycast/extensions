import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://html2jsx?clipboard";
  open(url);
};
