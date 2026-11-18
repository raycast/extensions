import { getPreferenceValues } from "@raycast/api";
import { ServiceKey } from "./api";

/** The `Preferences` type is auto-generated from package.json into raycast-env.d.ts. */
export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** Services enabled by default in preferences. */
export function defaultServices(p: Preferences): ServiceKey[] {
  const services: ServiceKey[] = [];
  if (p.defaultSlack) services.push("slack");
  if (p.defaultGitlab) services.push("gitlab");
  if (p.defaultGithub) services.push("github");
  return services;
}

/** Services that actually have a token configured. */
export function configuredServices(p: Preferences): ServiceKey[] {
  const services: ServiceKey[] = [];
  if (p.slackToken) services.push("slack");
  if (p.gitlabToken) services.push("gitlab");
  if (p.githubToken) services.push("github");
  return services;
}
