import { DatabaseDetail, DatabaseKind } from "./interfaces";

/**
 * Connection URIs for the five database kinds this extension manages.
 *
 * Transcribed from the templates Dokploy's own dashboard renders
 * (`components/dashboard/<kind>/general/show-internal-<kind>-credentials.tsx`), not derived from
 * each database's own documentation - quirks included:
 *
 * - Redis authenticates as the literal user `default`, and takes no database name.
 * - Mongo pins `authSource=admin` rather than using `databaseName`, omits the name from the path
 *   entirely, and adds `directConnection=true` unless it's running as a replica set.
 * - MariaDB gets the `mariadb://` scheme rather than `mysql://`, though the port is the same.
 *
 * A URI that disagrees with the one the dashboard shows is a bug here, even if it does connect.
 */

interface UriParts {
  host: string;
  port: number;
  database: DatabaseDetail;
}

interface DatabaseUriConfig {
  /** The port the database listens on inside `dokploy-network`, where every other service can reach it. */
  internalPort: number;
  /** Undefined when the row is missing something the URI cannot be built without. */
  build: (parts: UriParts) => string | undefined;
}

/**
 * Dokploy's generated passwords are alphanumeric, so for those this encodes to exactly the same
 * string the dashboard shows - but a hand-set password containing `@`, `:` or `/` would otherwise
 * produce a URI that silently parses into a different host.
 */
function encode(value: string): string {
  return encodeURIComponent(value);
}

const DATABASE_URIS: Record<DatabaseKind, DatabaseUriConfig> = {
  postgres: {
    internalPort: 5432,
    build: ({ host, port, database }) => {
      const { databaseUser: user, databasePassword: password, databaseName: name } = database;
      if (!user || !password || !name) return undefined;
      return `postgresql://${encode(user)}:${encode(password)}@${host}:${port}/${encode(name)}`;
    },
  },
  mysql: {
    internalPort: 3306,
    build: ({ host, port, database }) => {
      const { databaseUser: user, databasePassword: password, databaseName: name } = database;
      if (!user || !password || !name) return undefined;
      return `mysql://${encode(user)}:${encode(password)}@${host}:${port}/${encode(name)}`;
    },
  },
  mariadb: {
    internalPort: 3306,
    build: ({ host, port, database }) => {
      const { databaseUser: user, databasePassword: password, databaseName: name } = database;
      if (!user || !password || !name) return undefined;
      return `mariadb://${encode(user)}:${encode(password)}@${host}:${port}/${encode(name)}`;
    },
  },
  mongo: {
    internalPort: 27017,
    build: ({ host, port, database }) => {
      const { databaseUser: user, databasePassword: password, replicaSets } = database;
      if (!user || !password) return undefined;
      const direct = replicaSets ? "" : "&directConnection=true";
      return `mongodb://${encode(user)}:${encode(password)}@${host}:${port}/?authSource=admin${direct}`;
    },
  },
  redis: {
    internalPort: 6379,
    // No `databaseUser` field exists on Redis; Dokploy always connects as `default`.
    build: ({ host, port, database }) => {
      const { databasePassword: password } = database;
      if (!password) return undefined;
      return `redis://default:${encode(password)}@${host}:${port}`;
    },
  },
};

/**
 * The URI another service on the same Dokploy instance uses.
 *
 * The host is the database's `appName` verbatim: Dokploy names the Swarm service after it and
 * attaches it to `dokploy-network`, so Swarm's DNS resolves it for every other service on that
 * network. This is the URI you paste into an application's environment variables.
 */
export function internalConnectionUri(kind: DatabaseKind, database: DatabaseDetail): string | undefined {
  const config = DATABASE_URIS[kind];
  if (!database.appName) return undefined;
  return config.build({ host: database.appName, port: config.internalPort, database });
}

/**
 * The URI reachable from outside the server, for a GUI client or local development.
 *
 * Only exists once the database has been given an external port - until then it is reachable only
 * from inside `dokploy-network`, and there is nothing to hand out.
 */
export function externalConnectionUri(
  kind: DatabaseKind,
  database: DatabaseDetail,
  host: string | undefined,
): string | undefined {
  if (!database.externalPort || !host) return undefined;
  return DATABASE_URIS[kind].build({ host, port: database.externalPort, database });
}
