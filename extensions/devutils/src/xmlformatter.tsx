import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://xmlformatter?clipboard";
  open(url);
};
