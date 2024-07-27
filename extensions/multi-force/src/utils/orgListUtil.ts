/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { basename, join } from "node:path";
import fs from "node:fs/promises";

import { Org, AuthInfo, Global, SfError, trimTo15, ConfigAggregator, OrgConfigProperties } from "@salesforce/core";
import type { Record } from "@jsforce/jsforce-node";
import { omit } from "@salesforce/kit";
import utils, { isDefined } from "./sfOrgUtils";
import {
  ExtendedAuthFields,
  ExtendedAuthFieldsScratch,
  FullyPopulatedScratchOrgFields,
  ScratchOrgInfoSObject,
  AuthFieldsFromFS,
} from "../models/orgTypes";

type OrgGroups = {
  nonScratchOrgs: ExtendedAuthFields[];
  scratchOrgs: ExtendedAuthFieldsScratch[];
};

type OrgGroupsFullyPopulated = {
  nonScratchOrgs: ExtendedAuthFields[];
  scratchOrgs: FullyPopulatedScratchOrgFields[];
  other: ExtendedAuthFields[];
  sandboxes: ExtendedAuthFields[];
  devHubs: ExtendedAuthFields[];
};

type ExtendedScratchOrgInfo = Record &
  ScratchOrgInfoSObject & {
    // extra property populated by this command by resolving the devHubUsername to a devHubUsername
    devHubOrgId: string;
  };

export class OrgListUtil {
  /**
   * This method takes all locally configured orgs and organizes them into the following buckets:
   * { nonScratchOrgs: [{}], scratchOrgs: [{}] }
   * the scratchOrgInfo query.
   *
   * @param {string[]|null} userFilenames- an array of strings that are validated against the server.
   * @param {object} flags - the result of this.flags on an sfdx command
   */
  public static async readLocallyValidatedMetaConfigsGroupedByOrgType(
    userFilenames: string[],
    skipConnection = false,
  ): Promise<OrgGroupsFullyPopulated> {
    const contents = await OrgListUtil.readAuthFiles(userFilenames);
    const orgs = await OrgListUtil.groupOrgs(contents);

    // parallelize two very independent operations
    const [nonScratchOrgs, scratchOrgs] = await Promise.all([
      Promise.all(
        orgs.nonScratchOrgs.map(async (fields) => {
          if (!skipConnection && fields.username) {
            // skip completely if we're skipping the connection
            fields.connectedStatus = await OrgListUtil.determineConnectedStatusForNonScratchOrg(fields.username);
            if (!fields.isDevHub && fields.connectedStatus === "Connected") {
              // activating DevHub setting is irreversible so don't waste time checking any org we already know is a hub
              fields.isDevHub = await OrgListUtil.checkNonScratchOrgIsDevHub(fields.username);
            }
          }
          return fields;
        }),
      ),

      OrgListUtil.processScratchOrgs(orgs.scratchOrgs),
    ]);

    return {
      nonScratchOrgs,
      scratchOrgs,
      sandboxes: nonScratchOrgs.filter(sandboxFilter),
      other: nonScratchOrgs.filter(regularOrgFilter),
      devHubs: nonScratchOrgs.filter(devHubFilter),
    };
  }

  /**
   * Organizes the scratchOrgs by DevHub to optimize calls to retrieveScratchOrgInfoFromDevHub(), then calls reduceScratchOrgInfo()
   *
   * @param {ExtendedAuthFields[]} scratchOrgs- an array of strings that are validated against the server.
   * @returns the same scratch org list, but with updated information from the server.
   */
  public static async processScratchOrgs(
    scratchOrgs: ExtendedAuthFieldsScratch[],
  ): Promise<FullyPopulatedScratchOrgFields[]> {
    const orgIdsGroupedByDevHub = new Map<string, string[]>();
    scratchOrgs.forEach((fields) => {
      orgIdsGroupedByDevHub.set(
        fields.devHubUsername,
        (orgIdsGroupedByDevHub.get(fields.devHubUsername) ?? []).concat([trimTo15(fields.orgId)]),
      );
    });
    const updatedContents = (
      await Promise.all(
        Array.from(orgIdsGroupedByDevHub).map(([devHubUsername, orgIds]) =>
          OrgListUtil.retrieveScratchOrgInfoFromDevHub(devHubUsername, orgIds),
        ),
      )
    ).reduce((accumulator, iterator) => [...accumulator, ...iterator], []);

    return OrgListUtil.reduceScratchOrgInfo(updatedContents, scratchOrgs);
  }

  /**
   * Used to retrieve authInfo of the auth files
   *
   * @param fileNames All the filenames in the global hidden folder
   */
  public static async readAuthFiles(fileNames: string[]): Promise<AuthInfo[]> {
    // Ensure that the Global.SFDX_DIR exists
    // https://github.com/forcedotcom/cli/issues/2222
    await fs.mkdir(Global.SFDX_DIR, { recursive: true });

    const orgFileNames = (await fs.readdir(Global.SFDX_DIR)).filter((filename: string) =>
      filename.match(/^00D.{15}\.json$/g),
    );

    const allAuths: Array<AuthInfo | undefined> = await Promise.all(
      fileNames.map(async (fileName) => {
        try {
          const orgUsername = basename(fileName, ".json");
          const auth = await AuthInfo.create({ username: orgUsername });

          const userId = auth?.getFields().userId;

          // no userid?  Definitely an org primary user
          if (!userId) {
            return auth;
          }
          const orgId = auth.getFields().orgId;

          const orgFileName = `${orgId}.json`;
          // if userId, it could be created from password:generate command.  If <orgId>.json doesn't exist, it's also not a secondary user auth file
          if (orgId && !orgFileNames.includes(orgFileName)) {
            return auth;
          }
          // Theory: within <orgId>.json, if the userId is the first entry, that's the primary username.
          if (orgFileNames.includes(orgFileName)) {
            const orgFileContent = JSON.parse(await fs.readFile(join(Global.SFDX_DIR, orgFileName), "utf8")) as {
              usernames: string[];
            };
            const usernames = orgFileContent.usernames;
            if (usernames && usernames[0] === auth.getFields().username) {
              return auth;
            }
          }
        } catch (error) {
          console.error(error);
        }
      }),
    );
    return allAuths.filter(isDefined);
  }

  /**
   * Helper to group orgs by {scratchOrg, nonScratchOrgs}
   * Also identifies which are default orgs from config
   *
   * @param {object} contents -The authinfo retrieved from the auth files
   * @param {string[]} excludeProperties - properties to exclude from the grouped configs ex. ['refreshToken', 'clientSecret']
   * @private
   */
  public static async groupOrgs(authInfos: AuthInfo[]): Promise<OrgGroups> {
    const configAggregator = await ConfigAggregator.create();

    const results = await Promise.all(
      authInfos.map(async (authInfo): Promise<ExtendedAuthFields | ExtendedAuthFieldsScratch> => {
        // for (const authInfo of authInfos) {
        let currentValue: AuthFieldsFromFS;
        try {
          // we're going to assert that these have a username/orgId because they came from the auth files
          currentValue = removeRestrictedInfoFromConfig(authInfo.getFields(true) as AuthFieldsFromFS);
        } catch (error) {
          console.warn(`Error decrypting ${authInfo.getUsername()}`);
          currentValue = removeRestrictedInfoFromConfig(authInfo.getFields() as AuthFieldsFromFS);
        }

        const [alias, lastUsed] = await Promise.all([
          utils.getAliasByUsername(currentValue.username),
          fs.stat(join(Global.SFDX_DIR, `${currentValue.username}.json`)),
        ]);

        return {
          ...identifyDefaultOrgs({ ...currentValue, alias }, configAggregator),
          lastUsed: lastUsed.atime,
          alias,
        };
      }),
    );

    return {
      scratchOrgs: results.filter((result) => "expirationDate" in result) as ExtendedAuthFieldsScratch[],
      nonScratchOrgs: results.filter((result) => !("expirationDate" in result)),
    };
  }

  public static async retrieveScratchOrgInfoFromDevHub(
    devHubUsername: string,
    orgIdsToQuery: string[],
  ): Promise<ExtendedScratchOrgInfo[]> {
    const fields = [
      "CreatedDate",
      "Edition",
      "Status",
      "ExpirationDate",
      "Namespace",
      "OrgName",
      "CreatedBy.Username",
      "SignupUsername",
    ];

    try {
      const devHubOrg = await Org.create({ aliasOrUsername: devHubUsername });
      const conn = devHubOrg.getConnection();
      const data = await conn
        .sobject("ScratchOrgInfo")
        .find<ExtendedScratchOrgInfo>({ ScratchOrg: { $in: orgIdsToQuery } }, fields);
      return data.map((org) => ({
        ...org,
        devHubOrgId: devHubOrg.getOrgId(),
      }));
    } catch (err) {
      console.warn(`Error querying ${devHubUsername} for ${orgIdsToQuery.length} orgIds`);
      return [];
    }
  }

  public static async reduceScratchOrgInfo(
    updatedContents: Array<Partial<Record> & ExtendedScratchOrgInfo>,
    orgs: ExtendedAuthFieldsScratch[],
  ): Promise<FullyPopulatedScratchOrgFields[]> {
    const contentMap = new Map(updatedContents.map((org) => [org.SignupUsername, org]));

    const results = orgs.map((scratchOrgInfo): FullyPopulatedScratchOrgFields | string => {
      const updatedOrgInfo = contentMap.get(scratchOrgInfo.username);
      return updatedOrgInfo
        ? {
            ...scratchOrgInfo,
            signupUsername: updatedOrgInfo.SignupUsername,
            createdBy: updatedOrgInfo.CreatedBy.Username,
            createdDate: updatedOrgInfo.CreatedDate,
            devHubOrgId: updatedOrgInfo.devHubOrgId,
            devHubId: updatedOrgInfo.devHubOrgId,
            attributes: updatedOrgInfo.attributes,
            orgName: updatedOrgInfo.OrgName,
            edition: updatedOrgInfo.Edition,
            status: updatedOrgInfo.Status,
            expirationDate: updatedOrgInfo.ExpirationDate,
            isExpired: updatedOrgInfo.Status === "Deleted",
            namespace: updatedOrgInfo.Namespace,
          }
        : `Can't find ${scratchOrgInfo.username} in the updated contents`;
    });

    const warnings = results.filter((result): result is string => typeof result === "string");
    if (warnings.length) {
      warnings.forEach((warning) => console.warn(warning));
    }

    return results.filter((result): result is FullyPopulatedScratchOrgFields => typeof result !== "string");
  }

  /**
   * Asks the org if it's a devHub.  Because the dev hub setting can't be deactivated, only ask orgs that aren't already stored as hubs.
   * This has a number of side effects, including updating the AuthInfo files and
   *
   * @param username org to check for devHub status
   * @returns {Promise.<boolean>}
   */
  public static async checkNonScratchOrgIsDevHub(username: string): Promise<boolean> {
    try {
      const org = await Org.create({ aliasOrUsername: username });
      // true forces a server check instead of relying on AuthInfo file cache
      return await org.determineIfDevHubOrg(true);
    } catch {
      return false;
    }
  }

  /**
   * retrieves the connection info of an nonscratch org
   *
   * @param username The username used when the org was authenticated
   * @returns {Promise.<string>}
   */
  public static async determineConnectedStatusForNonScratchOrg(username: string): Promise<string | undefined> {
    try {
      const org = await Org.create({ aliasOrUsername: username });

      if (org.getField(Org.Fields.DEV_HUB_USERNAME)) {
        return;
      }

      try {
        await org.refreshAuth();
        return "Connected";
      } catch (err) {
        return authErrorHandler(err, org.getUsername() as string);
      }
    } catch (err) {
      return authErrorHandler(err, username);
    }
  }
}

export const identifyActiveOrgByStatus = (org: FullyPopulatedScratchOrgFields): boolean =>
  "status" in org && org.status === "Active";

/** Identify the default orgs */
const identifyDefaultOrgs = (
  orgInfo: AuthFieldsFromFS,
  config: ConfigAggregator,
): ExtendedAuthFields | ExtendedAuthFieldsScratch => {
  // remove undefined, since the config might also be undefined
  const possibleDefaults = [orgInfo.alias, orgInfo.username].filter(Boolean);
  return {
    ...orgInfo,
    isDefaultDevHubUsername: possibleDefaults.includes(config.getPropertyValue(OrgConfigProperties.TARGET_DEV_HUB)),
    isDefaultUsername: possibleDefaults.includes(config.getPropertyValue(OrgConfigProperties.TARGET_ORG)),
  };
};

/**
 * Helper utility to remove sensitive information from a scratch org auth config. By default refreshTokens and client secrets are removed.
 *
 * @param {*} config - scratch org auth object.
 * @param {string[]} properties - properties to exclude ex ['refreshToken', 'clientSecret']
 * @returns the config less the sensitive information.
 */
const removeRestrictedInfoFromConfig = (
  config: AuthFieldsFromFS,
  properties: string[] = ["refreshToken", "clientSecret"],
): AuthFieldsFromFS => omit<Omit<AuthFieldsFromFS, "refreshToken" | "clientSecret">>(config, properties);

const sandboxFilter = (org: AuthFieldsFromFS): boolean => Boolean(org.isSandbox);
const regularOrgFilter = (org: AuthFieldsFromFS): boolean => !org.isSandbox && !org.isDevHub;
const devHubFilter = (org: AuthFieldsFromFS): boolean => Boolean(org.isDevHub);

const authErrorHandler = async (err: unknown, username: string): Promise<string> => {
  const error = err as SfError;
  console.error(`error refreshing auth for org: ${username}`);
  console.error(error);
  // Orgs under maintenace return html as the error message.
  if (error.message.includes("maintenance")) return "Down (Maintenance)";
  // handle other potential html responses
  if (error.message.includes("<html>") || error.message.includes("<!DOCTYPE HTML>")) return "Bad Response";
  return error.code ?? error.message;
};
