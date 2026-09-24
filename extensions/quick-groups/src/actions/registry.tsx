import type { Image } from "@raycast/api";
import type { ReactElement } from "react";

export interface ActionDefinition {
  /** Stable annotation name used in Quick Groups YAML. */
  name: string;
  /** Human-readable action title. */
  title: string;
  /** Icon shown beside fields that provide this action. */
  icon: Image.ImageLike;
  /** Prevent the target, and values derived from it, from being indexed or displayed. */
  sensitive?: boolean;
  /** Return the Raycast action that consumes the resolved annotation target. */
  render(target: string): ReactElement;
}

export interface ActionResolver {
  /** Reserved action-name prefix, including its trailing slash. */
  prefix: string;
  /** Return an action definition for a complete namespaced name. */
  resolve(name: string): ActionDefinition | undefined;
}

const definitions = new Map<string, ActionDefinition>();
const resolvers = new Map<string, ActionResolver>();

export function registerAction(definition: ActionDefinition): void {
  if (!/^[a-z][a-z0-9_-]*$/.test(definition.name)) {
    throw new Error(
      `Invalid Quick Groups action name "${definition.name}"; use lowercase letters, numbers, underscores, and hyphens`,
    );
  }
  if (definitions.has(definition.name)) {
    throw new Error(`Quick Groups action "${definition.name}" is already registered`);
  }
  definitions.set(definition.name, Object.freeze({ ...definition }));
}

export function registerActionResolver(resolver: ActionResolver): void {
  if (!/^[a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)*\/$/.test(resolver.prefix)) {
    throw new Error(
      `Invalid Quick Groups action prefix "${resolver.prefix}"; use lowercase path segments and a trailing slash`,
    );
  }
  if (resolvers.has(resolver.prefix)) {
    throw new Error(`Quick Groups action prefix "${resolver.prefix}" is already registered`);
  }
  resolvers.set(resolver.prefix, Object.freeze({ ...resolver }));
}

export function getActionDefinition(name: string): ActionDefinition | undefined {
  const exact = definitions.get(name);
  if (exact) return exact;
  const matchingResolvers = [...resolvers.values()]
    .filter((resolver) => name.startsWith(resolver.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  for (const resolver of matchingResolvers) {
    const resolved = resolver.resolve(name);
    if (resolved) return resolved;
  }
  return undefined;
}

export function isRegisteredAction(name: string): boolean {
  return getActionDefinition(name) !== undefined;
}

export function isReservedActionNamespace(name: string): boolean {
  const namespace = name.split("/", 1)[0];
  return [...resolvers.keys()].some((prefix) => prefix.startsWith(`${namespace}/`));
}

export function registeredActionNames(): string[] {
  return [...definitions.keys()];
}

export function registeredActionPrefixes(): string[] {
  return [...resolvers.keys()];
}
