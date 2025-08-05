import { shellEnv } from "shell-env";

interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

let cachedEnv: null | EnvType = null;

export const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: env.HOME || `/Users/${process.env.USER}`,
    shell: env.SHELL,
  };
  return cachedEnv;
};
