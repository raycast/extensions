import { openDevkin } from "./open";

export default async function Command(): Promise<void> {
  await openDevkin("base64-string", "Base64 String Converter");
}
