import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://htmlpreview?clipboard";
  open(url);
};
