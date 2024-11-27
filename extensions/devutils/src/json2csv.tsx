import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://json2csv?clipboard";
  open(url);
};
