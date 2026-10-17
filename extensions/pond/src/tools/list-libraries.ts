import { pondClient } from "../api";

export default async function ListLibraries() {
  return pondClient().libraries();
}
