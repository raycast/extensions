import { Resource } from "../types/resource";

export function getPhpResources(resources: Resource[]) {
  return resources.filter((resource) => {
    return resource.url.toLowerCase().includes("php.net");
  });
}

export function getExternalResources(resources: Resource[]) {
  return resources.filter((resource) => {
    return !resource.url.toLowerCase().includes("php.net");
  });
}
