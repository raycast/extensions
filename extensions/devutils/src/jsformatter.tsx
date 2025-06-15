import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://jsformatter?clipboard";
  open(url);
};
