export type EnvLookupArgs = {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath?: string;
  packageDir: string;
  packageName: string;
};

/**
 * ホームディレクトリの候補を解決する
 */
function resolveHomeDir(env: NodeJS.ProcessEnv): string | null {
  const home = env.HOME?.trim();
  if (home !== undefined && home.length > 0) {
    return home;
  }
  const userProfile = env.USERPROFILE?.trim();
  if (userProfile !== undefined && userProfile.length > 0) {
    return userProfile;
  }
  return null;
}

/**
 * EnvLookupArgs を現在のプロセス情報から組み立てる
 */
export function buildEnvLookupArgs(packageDir: string, packageName: string): EnvLookupArgs {
  return {
    env: process.env,
    cwd: process.cwd(),
    homeDir: resolveHomeDir(process.env),
    packageDir,
    packageName,
  };
}

/**
 * 実行環境から設定値を解決する
 */
export async function loadEnvValue(args: EnvLookupArgs, key: string): Promise<string | null> {
  const fromEnv = args.env[key]?.trim();
  return fromEnv || null;
}
