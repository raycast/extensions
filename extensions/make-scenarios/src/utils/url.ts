import { Zone } from "../api/types.js";

export function buildScenarioUrl(
  zone: Zone,
  teamId: number,
  scenarioId: number,
): string {
  return `https://${zone}/${teamId}/scenarios/${scenarioId}/edit`;
}

export function buildOrgScenariosUrl(zone: Zone, teamId: number): string {
  return `https://${zone}/${teamId}/scenarios?folder=all&tab=all&type=scenario&sort=lastEdited`;
}

/** Extracts short zone label, e.g. "eu1.make.com" → "eu1" */
export function zoneLabel(zone: Zone): string {
  return zone.split(".")[0];
}
