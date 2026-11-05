import { pond } from "../api/client";

export default async function tool() {
  return (await pond().libraries()).map((library) => ({
    name: library.name,
    path: library.path,
    active: library.active,
    available: library.available,
    lastOpened: new Date(library.lastOpened).toISOString(),
  }));
}
