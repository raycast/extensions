import { getPreferenceValues } from "@raycast/api";
import { ServiceKey } from "./api";
import { DurationKey } from "./duration";

export interface Prefs {
  slackToken?: string;
  gitlabToken?: string;
  gitlabUrl: string;
  githubToken?: string;
  defaultSlack: boolean;
  defaultGitlab: boolean;
  defaultGithub: boolean;
  defaultDuration: DurationKey;
  calendarIcsUrl?: string;
}

export function getPrefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

/** Services enabled by default in preferences. */
export function defaultServices(p: Prefs): ServiceKey[] {
  const services: ServiceKey[] = [];
  if (p.defaultSlack) services.push("slack");
  if (p.defaultGitlab) services.push("gitlab");
  if (p.defaultGithub) services.push("github");
  return services;
}

/** Services that actually have a token configured. */
export function configuredServices(p: Prefs): ServiceKey[] {
  const services: ServiceKey[] = [];
  if (p.slackToken) services.push("slack");
  if (p.gitlabToken) services.push("gitlab");
  if (p.githubToken) services.push("github");
  return services;
}
