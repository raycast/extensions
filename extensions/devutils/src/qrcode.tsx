import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://qrcode?clipboard";
  open(url);
};
