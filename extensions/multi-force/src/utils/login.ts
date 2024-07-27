/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfdcUrl, SfProject } from "@salesforce/core";
import { getString, isObject } from "@salesforce/ts-types";

const resolveLoginUrl = async (instanceUrl?: string): Promise<string> => {
  const loginUrl = instanceUrl ?? (await getLoginUrl());
  throwIfLightning(loginUrl);
  return loginUrl;
};

/** try to get url from project if there is one, otherwise use the default production URL  */
const getLoginUrl = async (): Promise<string> => {
  try {
    const project = await SfProject.resolve();
    const projectJson = await project.resolveProjectConfig();
    return getString(projectJson, "sfdcLoginUrl", SfdcUrl.PRODUCTION);
  } catch (err) {
    const message: string = (isObject(err) ? Reflect.get(err, "message") ?? err : err) as string;
    console.error(message);
    return SfdcUrl.PRODUCTION;
  }
};
const throwIfLightning = (urlString: string): void => {
  const url = new SfdcUrl(urlString);
  if (url.isLightningDomain() || (url.isInternalUrl() && url.origin.includes(".lightning."))) {
    // throw new SfError(messages.getMessage('lightningInstanceUrl'), 'LightningDomain', [
    //   messages.getMessage('flags.instance-url.description'),
    // ]);
    console.error("Something bad happened in common.");
  }
};

export default {
  resolveLoginUrl,
};
