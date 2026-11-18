import { pond } from "../api/client";

export default async function tool() {
  return pond().libraryInfo();
}
