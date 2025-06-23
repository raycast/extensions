import { getEnhancedNodePaths } from "./node-path-resolver";

export const getExecOptions = () => ({
  env: {
    ...process.env,
    PATH: getEnhancedNodePaths(),
    NVM_DIR: process.env.NVM_DIR || `${process.env.HOME}/.nvm`,
    FNM_DIR: process.env.FNM_DIR || `${process.env.HOME}/.fnm`,
    npm_config_prefix: process.env.npm_config_prefix || `${process.env.HOME}/.npm-global`,
  },
  timeout: 30000,
  cwd: process.env.HOME,
});
