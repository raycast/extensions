import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://base64image?clipboard";
  open(url);
};
