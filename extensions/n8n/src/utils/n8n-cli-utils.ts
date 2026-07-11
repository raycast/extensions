import { execSync } from "child_process";
import { shellEnv } from "shell-env";
import { Workflow } from "../types/types";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const n8nAppCLI = `/Applications/n8n.app/Contents/Resources/app/node_modules/n8n/bin/n8n `;

interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

let cachedEnv: null | EnvType = null;

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

export const getAllWorkFlowsCLI = async () => {
  let workflows: Workflow[] = [];
  try {
    const execEnv = await getCachedEnv();
    const childProcess = execSync(n8nAppCLI + "export:workflow --all", execEnv);
    workflows = JSON.parse(childProcess.toString());
  } catch (e) {
    console.error(String(e));
  }
  return workflows;
};

export const executeWorkFlowsCLI = async (id: string | number) => {
  try {
    const execEnv = await getCachedEnv();
    const childProcess = execSync(n8nAppCLI + "execute --id " + id, execEnv);
    return childProcess.toString();
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const triggerWorkFlowsCLI = async (id: string | number, active: boolean) => {
  try {
    const execEnv = await getCachedEnv();
    const childProcess = execSync(n8nAppCLI + `update:workflow --id=${id} --active=${active}`, execEnv);
    return childProcess.toString();
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const triggerAllWorkFlowsCLI = async (active: boolean) => {
  try {
    const execEnv = await getCachedEnv();
    const childProcess = execSync(n8nAppCLI + `update:workflow --all --active=${active}`, execEnv);
    return childProcess.toString();
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};
