import type { Data, Destination } from "./model";
export function saveDestination(data: Data, next: Destination) {
  const old = data.destinations.find((d) => d.id === next.id);
  if (old && old.kind !== next.kind && data.links.some((l) => l.collectionId === next.id))
    throw new Error("This collection contains links. Move them before changing its type.");
  if (
    data.destinations.some(
      (d) => d.id !== next.id && d.kind === next.kind && d.name.toLowerCase() === next.name.toLowerCase(),
    )
  )
    throw new Error("A destination with this name already exists.");
  if (
    next.kind === "folder" &&
    data.destinations.some((d) => d.id !== next.id && d.kind === "folder" && d.path === next.path)
  )
    throw new Error("This folder is already configured. Edit the existing destination instead.");
  data.destinations = data.destinations.filter((d) => d.id !== next.id).concat(next);
}
