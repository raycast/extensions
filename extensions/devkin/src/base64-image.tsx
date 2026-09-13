import { openDevkin } from "./open";

export default async function Command(): Promise<void> {
  await openDevkin("base64-image", "Base64 Image Converter");
}
