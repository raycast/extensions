import { getClient } from "./client";

export function techStack(domain: string) {
  return getClient().techStack(domain);
}
