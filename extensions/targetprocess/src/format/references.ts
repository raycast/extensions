import { Entity } from "../api/types";

function splitCamelCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function idAndTitle(entity: Entity): string {
  return `${entity.id}: ${entity.name}`;
}

export function markdownLink(entity: Entity, url: string): string {
  return `[${idAndTitle(entity)}](${url})`;
}

export function typeAndId(entity: Entity): string {
  return `${splitCamelCase(entity.type)} ${entity.id}`;
}
