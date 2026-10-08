/* eslint-disable @typescript-eslint/no-explicit-any */
// Assuming useCache and useReleases are defined elsewhere
import { useCachedPromise, useExec } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { ensureCLI } from "./ensure-cli";
import { FlutterReleasesResponse, FvmContextResponse, VersionCacheResponse } from "./models";
import { FvmCommand, execFvm } from "./runner";
import { EnvType, getCachedEnv } from "./utils";

type Environment = {
  execPath: string;
  env: EnvType;
};

const loadEnvironment = async (): Promise<Environment> => {
  const result = await Promise.all([getCachedEnv(), ensureCLI()]);
  return {
    env: result[0],
    execPath: result[1],
  };
};

const useFvmCli = () => {
  const { data } = useCachedPromise(loadEnvironment, [], { keepPreviousData: false });

  const [env, setEnv] = useState<Environment>();

  // Set path and env only once
  useEffect(() => {
    if (!env) {
      setEnv(data);
    }
  }, [data, env]);

  const ready = !!env;

  return useMemo(() => {
    return {
      ...env,
      ready,
    };
  }, [ready, env]);
};

export type FVMController = ReturnType<typeof useController>;

export const useController = () => {
  const listCommand = useAPICommand(FvmCommand.list, VersionCacheResponse.fromJson, ["-s", "--compress"]);
  const releasesCommand = useAPICommand(FvmCommand.releases, FlutterReleasesResponse.fromJson);
  const contextCommand = useAPICommand(FvmCommand.context, FvmContextResponse.fromJson);

  const revalidate = useMemo(() => {
    return {
      cache: listCommand.revalidate,
      releases: releasesCommand.revalidate,
      context: contextCommand.revalidate,
    };
  }, []);

  const data = useMemo(() => {
    return {
      cache: listCommand.data,
      versions: releasesCommand.data?.versions,
      channels: releasesCommand.data?.channels,
      context: contextCommand.data?.context,
    };
  }, [listCommand.data, releasesCommand.data, contextCommand.data]);

  const isLoading = useMemo(() => {
    return listCommand.isLoading || releasesCommand.isLoading || contextCommand.isLoading;
  }, [listCommand.isLoading, releasesCommand.isLoading, contextCommand.isLoading]);

  const error = useMemo(() => {
    return listCommand.error ?? releasesCommand.error, contextCommand.error;
  }, [listCommand.error, releasesCommand.error, contextCommand.error]);

  return {
    data,
    isLoading,
    error,
    revalidate: revalidate,
  };
};

type OutputParser<T> = (output: string) => T;

function useAPICommand<T>(command: FvmCommand, parser: OutputParser<T>, args: string[] = []) {
  const { execPath, env, ready } = useFvmCli();

  const { data, isLoading, error, revalidate, mutate } = useExec(execPath ?? "", ["api", command, ...args], {
    encoding: "utf8",
    env: env?.env,
    cwd: env?.cwd,
    shell: env?.shell,
    timeout: 5000,
    keepPreviousData: true,
    execute: !!ready,
  });

  return {
    data: data ? parser(data) : undefined,
    isLoading: !ready || isLoading,
    error,
    revalidate,
    mutate,
  };
}

export async function getFvmContext(): Promise<FvmContextResponse> {
  const result = await execFvm("api context");
  return FvmContextResponse.fromJson(result.stdout);
}

export async function getReleases(): Promise<FlutterReleasesResponse> {
  const result = await execFvm("api releases");
  return FlutterReleasesResponse.fromJson(result.stdout);
}

export async function getCavchedVersions(): Promise<VersionCacheResponse> {
  const result = await execFvm("api list");
  return VersionCacheResponse.fromJson(result.stdout);
}
