import { pondClient } from "../api";

export default async function GetLibraryInfo() {
  return pondClient().libraryInfo();
}
