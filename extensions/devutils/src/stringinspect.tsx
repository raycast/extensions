import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://stringinspect?clipboard";
  open(url);
};
