import { Instance } from "../types";

export function instanceLabel(instance: Pick<Instance, "name" | "alias">): string {
  return instance.alias ? instance.alias : instance.name;
}
