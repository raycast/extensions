import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://stringcaseconverter?clipboard";
  open(url);
};
