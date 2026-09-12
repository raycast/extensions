import { getConfiguredStorageNotePath } from "./config";
import { RaylogRepository } from "./storage";

export function createMenuBarRepository(notePath = getConfiguredStorageNotePath()): RaylogRepository | undefined {
  return notePath ? new RaylogRepository(notePath) : undefined;
}
