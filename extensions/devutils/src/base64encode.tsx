import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://base64encode?clipboard";
  open(url);
};
