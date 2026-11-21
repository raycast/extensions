import Dockerode from '@priithaamer/dockerode';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { Agent } from 'node:https';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';

export type DockerOptions = Dockerode.DockerOptions & { agent?: Agent };

interface DockerContext {
  name: string;
  host: string;
  skipTLSVerify: boolean;
  tlsDir: string;
}

const dockerConfigDir = (env: NodeJS.ProcessEnv): string => env.DOCKER_CONFIG || join(homedir(), '.docker');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = (path: string): any | undefined => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
};

const readIfExists = (path: string): Buffer | undefined => (existsSync(path) ? readFileSync(path) : undefined);

/**
 * Reads the currently selected Docker CLI context.
 *
 * Mirrors the lookup done by the Docker CLI: the context name comes from `DOCKER_CONTEXT`
 * or `currentContext` in `~/.docker/config.json`, its endpoint is stored in
 * `~/.docker/contexts/meta/<sha256(name)>/meta.json` and its TLS material (if any) in
 * `~/.docker/contexts/tls/<sha256(name)>/docker/`.
 */
export const currentDockerContext = (env: NodeJS.ProcessEnv = process.env): DockerContext | undefined => {
  const configDir = dockerConfigDir(env);
  const name: unknown = env.DOCKER_CONTEXT || readJson(join(configDir, 'config.json'))?.currentContext;

  if (typeof name !== 'string' || name === '' || name === 'default') {
    return undefined;
  }

  const id = createHash('sha256').update(name).digest('hex');
  const endpoint = readJson(join(configDir, 'contexts', 'meta', id, 'meta.json'))?.Endpoints?.docker;
  const host: unknown = endpoint?.Host;

  if (typeof host !== 'string' || host === '') {
    return undefined;
  }

  return {
    name,
    host,
    skipTLSVerify: endpoint?.SkipTLSVerify === true,
    tlsDir: join(configDir, 'contexts', 'tls', id, 'docker'),
  };
};

/**
 * Turns a Docker host string (`unix://`, `npipe://`, `tcp://`, `http://`, `https://` or a bare
 * socket path) into dockerode connection options.
 */
export const optionsForHost = (host: string): DockerOptions => {
  if (host.startsWith('unix://')) {
    return { socketPath: host.slice('unix://'.length) };
  }

  if (host.startsWith('npipe://')) {
    return { socketPath: host.slice('npipe://'.length) };
  }

  if (/^(tcp|https?):\/\//.test(host)) {
    const url = new URL(host);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 2375,
      protocol: url.protocol === 'https:' ? 'https' : 'http',
    };
  }

  return { socketPath: host };
};

/**
 * The bundled docker-modem has no SSH transport, so an `ssh://` context cannot be honoured.
 * Returning `undefined` keeps the previous behaviour (platform default socket) for such users
 * instead of silently misreading the URI as a local socket path.
 */
const optionsForContext = (context: DockerContext): DockerOptions | undefined => {
  if (context.host.startsWith('ssh://')) {
    return undefined;
  }

  const options = optionsForHost(context.host);

  if (!options.host) {
    return options;
  }

  const ca = readIfExists(join(context.tlsDir, 'ca.pem'));
  const cert = readIfExists(join(context.tlsDir, 'cert.pem'));
  const key = readIfExists(join(context.tlsDir, 'key.pem'));

  // Like the Docker CLI, use TLS when the context ships certificates or asks to skip verification.
  if (ca || cert || key || context.skipTLSVerify) {
    Object.assign(options, { ca, cert, key, protocol: 'https' });
  }

  // docker-modem does not forward `rejectUnauthorized`, but it does forward `agent`, and agent
  // options win over per-request options, so this disables chain and hostname verification the
  // same way `InsecureSkipVerify` does in the CLI.
  if (context.skipTLSVerify) {
    options.agent = new Agent({ rejectUnauthorized: false });
  }

  return options;
};

/**
 * Picks the dockerode connection options, in order of precedence:
 * 1. the `socketPath` extension preference
 * 2. the `DOCKER_HOST` environment variable (together with `DOCKER_CERT_PATH` and
 *    `DOCKER_TLS_VERIFY`), handled by docker-modem itself
 * 3. the endpoint and TLS settings of the current Docker CLI context (unless it is `ssh://`)
 * 4. docker-modem's platform default socket
 *
 * Returns `undefined` for 2 and 4 so that docker-modem applies its own defaults.
 */
export const resolveDockerOptions = (
  preference: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): DockerOptions | undefined => {
  const trimmedPreference = preference?.trim();
  if (trimmedPreference) {
    return optionsForHost(trimmedPreference);
  }

  if (env.DOCKER_HOST) {
    return undefined;
  }

  const context = currentDockerContext(env);
  return context ? optionsForContext(context) : undefined;
};
