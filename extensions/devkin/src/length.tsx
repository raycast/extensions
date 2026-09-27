import { openDevkin } from "./open";

export default async function Command(): Promise<void> {
  await openDevkin("length", "Length Converter");
}
