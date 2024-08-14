import type { ApolloClient } from "@apollo/client";

import { useExec } from "@raycast/utils";

import { useQuery } from "@apollo/client";
import { parse } from "semver";

import { GET_LATEST_VERSION } from "../api/github/queries";
import { shell, shellEnv } from "../constants";

export function useLocalBunVersion() {
  return useExec("bun --version && bun --revision", {
    shell,
    env: shellEnv,
    parseOutput({ stdout }) {
      const stdoutLines = stdout.trim().split(/\r?\n/);

      const revisionMatch = stdoutLines[1]?.match(/(.+)\+(.+)/);

      const version = parse(stdoutLines[0], { loose: true }) || parse(revisionMatch?.[1], { loose: true });

      if (!version) {
        return null;
      }

      return Object.assign(version, { commit: revisionMatch?.[2] || null, revision: revisionMatch?.[0] || null });
    },
  });
}

export function useLatestBunVersion(client?: ApolloClient<object>) {
  const result = useQuery(GET_LATEST_VERSION, {
    client,
    variables: {
      owner: "oven-sh",
      name: "bun",
    },
  });
  return {
    ...result,
    ...result.data?.repository?.latestRelease,
    version: getVersionFromTagName(result.data?.repository?.latestRelease?.tagName),
  };
}

/**
 * Gets the version number from a release's tag name.
 *
 * This function is strongly typed, because I was bored and I
 * enjoy writing types. So if you write the following code, the
 * variable `versionA` will be typed as `"1.0.28"` and the
 * variable `versionB` will be typed as `string | null`.
 *
 * ```ts
 * const versionA = getVersionFromTagName('bun-v1.0.28');
 * const versionB = getVersionFromTagName('hello');
 * ```
 */
export function getVersionFromTagName<T extends string>(tagName: `bun-v${T}`): T;
export function getVersionFromTagName(tagName?: string): string | null;
export function getVersionFromTagName(tagName?: string) {
  return tagName?.match(/^bun-v(.+)$/)?.[1] || null;
}
