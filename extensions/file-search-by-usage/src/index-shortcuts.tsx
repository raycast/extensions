import { indexGoogleDrive } from "./lib/drive-setup";

export default async function Command() {
  await indexGoogleDrive();
}
