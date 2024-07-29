/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { StateAggregator } from "@salesforce/core";

export const getAliasByUsername = async (username: string): Promise<string | undefined> => {
  const stateAggregator = await StateAggregator.getInstance();
  const keys = stateAggregator.aliases.getAll(username);
  // use the most recently added alias for that username
  return keys?.length ? keys[keys.length - 1] : undefined;
};

export default {
  getAliasByUsername,
};

export const isDefined = <T>(value: T | undefined | null): value is T => value !== undefined && value !== null;
