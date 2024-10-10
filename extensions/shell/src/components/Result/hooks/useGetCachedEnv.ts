import { shellEnv } from "shell-env";
import type { EnvType } from "../../Command/helpers/types";

export const useGetCachedEnv = () => {
  let cachedEnv: EnvType | null = null;

  const getCachedEnv = async () => {
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

  return { getCachedEnv };
};
