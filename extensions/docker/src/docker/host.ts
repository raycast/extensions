import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';

export type DockerodeOptions = { socketPath: string } | { host: string; port: number; protocol: 'http' | 'https' };

const REMOTE_PROTOCOLS = ['http://', 'https://', 'tcp://'];

const dockerConfigDir = (env: NodeJS.ProcessEnv): string => env.DOCKER_CONFIG || join(homedir(), '.docker');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = (path: string): any | undefined => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
};

/**
 * Resolves the Docker host of the currently selected Docker CLI context.
 *
 * Mirrors the lookup done by the Docker CLI: the context name comes from `DOCKER_CONTEXT`
 * or `currentContext` in `~/.docker/config.json`, and its endpoint is stored in
 * `~/.docker/contexts/meta/<sha256(name)>/meta.json`.
 */
export const hostFromDockerContext = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const configDir = dockerConfigDir(env);
  const contextName: unknown = env.DOCKER_CONTEXT || readJson(join(configDir, 'config.json'))?.currentContext;

  if (typeof contextName !== 'string' || contextName === '' || contextName === 'default') {
    return undefined;
  }

  const contextId = createHash('sha256').update(contextName).digest('hex');
  const host: unknown = readJson(join(configDir, 'contexts', 'meta', contextId, 'meta.json'))?.Endpoints?.docker?.Host;

  return typeof host === 'string' && host !== '' ? host : undefined;
};

/**
 * Picks the Docker host to connect to, in order of precedence:
 * 1. the `socketPath` extension preference
 * 2. the `DOCKER_HOST` environment variable
 * 3. the endpoint of the current Docker CLI context
 *
 * Returns `undefined` when none is set so that dockerode falls back to its platform default.
 */
export const resolveDockerHost = (
  preference: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => {
  const trimmedPreference = preference?.trim();
  if (trimmedPreference) {
    return trimmedPreference;
  }

  return env.DOCKER_HOST || hostFromDockerContext(env);
};

export const dockerodeOptions = (host: string | undefined): DockerodeOptions | undefined => {
  if (!host) {
    return undefined;
  }

  if (REMOTE_PROTOCOLS.some((protocol) => host.startsWith(protocol))) {
    const url = new URL(host);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 2375,
      protocol: url.protocol === 'https:' ? 'https' : 'http',
    };
  }

  if (host.startsWith('unix://')) {
    return { socketPath: host.slice('unix://'.length) };
  }

  if (host.startsWith('npipe://')) {
    return { socketPath: host.slice('npipe://'.length) };
  }

  return { socketPath: host };
};
