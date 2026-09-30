import fs from 'fs-extra';
import camelCase from 'lodash/camelCase';
import type { SimplifiedTeam, SimplifiedTeamOptions } from '../types';
import * as cached from '../utils/cache';

/**
 * This function will return a new object whose keys are in camelCase format.
 * For example, if the given object has a key as `directly-responsible-individual`, the return object will have a key as `directlyResponsibleIndividual`
 */
function makeCamelCaseObject(inputObject: Record<string, unknown>): Record<string, unknown> {
  const resultObject: Record<string, unknown> = {};

  Object.keys(inputObject).forEach((key) => {
    const value = inputObject[key];
    const newCamelCaseKey = camelCase(key);
    resultObject[newCamelCaseKey] = value;
  });

  return resultObject;
}

/**
 * Read `teams.json` file and return list of team objects.
 * The function will cache the results to improve performance.
 * If `shouldIgnoreCache` is true, the function will always query data from file.
 * @returns a map of teams has key as team name and value as team object.
 */
export function getTeamsMap(options: SimplifiedTeamOptions = {}): Map<string, SimplifiedTeam> {
  const resultTeams = new Map<string, SimplifiedTeam>();

  try {
    if (!options.shouldIgnoreCache) {
      const cachedData = cached.get(cached.CacheKeys.TEAMS);
      if (cachedData) {
        const returnedData = JSON.parse(cachedData);
        if (returnedData.length) {
          return returnedData;
        }
      }
    }

    const { teamsJsonPath } = options;

    if (!teamsJsonPath || !fs.existsSync(teamsJsonPath)) {
      console.error('Missing `teams.json` file path');
      return resultTeams;
    }

    const dataTeams = fs.readJSONSync(teamsJsonPath) as Record<string, unknown>;

    Object.keys(dataTeams).map((key) => {
      const teamName = key;
      const otherTeamInfo = dataTeams[key] as Record<string, unknown>;

      const team = { name: teamName, ...makeCamelCaseObject(otherTeamInfo) } as unknown as SimplifiedTeam;
      resultTeams.set(teamName.toLowerCase(), team);
    });

    // cache data to avoid reading file from disk so often.
    cached.set(cached.CacheKeys.TEAMS, JSON.stringify(resultTeams));
    return resultTeams;
  } catch (error) {
    // clean cache when error happens
    cached.remove(cached.CacheKeys.TEAMS);
    console.log(`Cannot read JSON file in 'getTeamList' function`, error);
  }

  return resultTeams;
}
