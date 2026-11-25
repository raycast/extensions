import { ActionPanel, Action, Detail, getPreferenceValues } from "@raycast/api";
import { useFetch, useCachedState, showFailureToast } from "@raycast/utils";
import { useState, useMemo } from "react";

type ConnectionEndpoint = {
  host: string;
  port: number;
  connectionString?: string;
};

type PrismaApiResponse = {
  data?: {
    id: string;
    database: {
      id: string;
      name: string;
      region?: {
        id: string;
      };
      connections?: Array<{
        endpoints?: {
          direct?: ConnectionEndpoint;
          pooled?: ConnectionEndpoint;
        };
      }>;
      /** Deprecated by the Prisma Management API, kept as a fallback. Use `connections[]`. */
      apiKeys?: Array<{
        directConnection?: {
          user: string;
          pass: string;
          host: string;
          port?: number;
          database?: string;
        } | null;
      }>;
    };
  };
  error?: {
    message: string;
    status?: number;
  };
};

type DatabaseInfo = {
  connectionString: string;
  claimUrl: string;
  deletionDate: string;
  region: string;
  name: string;
  projectId: string;
};

const CREATE_DB_WORKER_URL = "https://create-db-temp.prisma.io";
const UTM = "utm_source=raycast&utm_medium=prisma-postgres";

function getConnectionString(database: NonNullable<PrismaApiResponse["data"]>["database"]): string | null {
  const connection = database.connections?.find(
    (c) => Boolean(c.endpoints?.direct?.connectionString) || Boolean(c.endpoints?.pooled?.connectionString),
  );
  const fromEndpoints =
    connection?.endpoints?.direct?.connectionString ?? connection?.endpoints?.pooled?.connectionString;
  if (fromEndpoints) {
    return fromEndpoints;
  }

  // Fallback for the deprecated apiKeys[].directConnection shape
  const legacy = database.apiKeys?.[0]?.directConnection;
  if (!legacy) {
    return null;
  }
  const port = legacy.port ? `:${legacy.port}` : "";
  return `postgresql://${encodeURIComponent(legacy.user)}:${encodeURIComponent(legacy.pass)}@${legacy.host}${port}/${legacy.database || "postgres"}?sslmode=require`;
}

export default function Command() {
  const preferences = getPreferenceValues<{ defaultRegion: string }>();
  const [databaseHistory, setDatabaseHistory] = useCachedState<DatabaseInfo[]>("prisma-postgres-history", []);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleError(error: unknown) {
    const message = error instanceof Error ? error.message : "Database creation failed";
    setHasExecuted(true);
    setErrorMessage(message);
    showFailureToast(error, { title: "Could not create database" });
  }

  const timestamp = useMemo(() => new Date().toISOString(), []);

  useFetch(`${CREATE_DB_WORKER_URL}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      region: preferences.defaultRegion,
      name: timestamp,
      utm_source: "raycast-extension",
    }),
    execute: !hasExecuted && !databaseInfo,
    parseResponse: async (response) => {
      if (response.status === 429) {
        throw new Error("Too many databases created in a short time. Please wait a few minutes and try again.");
      }
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Database creation failed: ${error}`);
      }
      return (await response.json()) as PrismaApiResponse;
    },
    onData: async (result) => {
      try {
        if (result.error) {
          throw new Error(result.error.message || "Database creation failed");
        }
        if (!result.data) {
          throw new Error("Invalid response from database service");
        }

        const projectId = result.data.id;
        const database = result.data.database;
        const dbName = database.name;
        const dbRegion = database.region?.id;
        const connectionString = getConnectionString(database);

        if (!connectionString) {
          throw new Error("Connection details not available");
        }

        const claimUrl = `https://create-db.prisma.io/claim?projectID=${projectId}&utm_source=raycast-extension&utm_medium=cli`;
        const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const dbInfo: DatabaseInfo = {
          connectionString,
          claimUrl,
          deletionDate: expiryDate.toISOString(),
          region: dbRegion || preferences.defaultRegion,
          name: dbName,
          projectId,
        };

        setHasExecuted(true);
        setDatabaseHistory([dbInfo, ...databaseHistory]);
        setDatabaseInfo(dbInfo);
      } catch (error) {
        handleError(error);
      }
    },
    onError: handleError,
  });

  if (databaseInfo) {
    const markdown = `
# 🎉 Your database is ready. Let's go! 

---

## 🔗 Database URL (Press ⏎/Enter to copy)

\`\`\`
${databaseInfo.connectionString}
\`\`\`


---

## 🎁 Claim URL

⚠️ Your database will be automatically deleted in 24 hours.

Want to keep it? Claim it with a free Prisma account. The Free plan includes 200,000 operations a month and 2 GB of storage, no credit card needed:

${databaseInfo.claimUrl}

---

## 🧱 Next steps

- Query it with [Prisma ORM](https://www.prisma.io/orm?${UTM}) or any Postgres client
- Host your app next to it on [Prisma Compute](https://www.prisma.io/compute?${UTM})

**Prisma Postgres** • [prisma.io/postgres](https://www.prisma.io/postgres?${UTM})
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Connection String"
              content={databaseInfo.connectionString}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.OpenInBrowser
              title="Claim Database"
              url={databaseInfo.claimUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CopyToClipboard
              title="Copy Claim URL"
              content={databaseInfo.claimUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (errorMessage) {
    return (
      <Detail
        markdown={`# Could not create a database\n\n${errorMessage}\n\nCheck [Prisma status](https://www.prisma-status.com/) or try again in a few minutes.`}
      />
    );
  }

  return (
    <Detail
      isLoading={true}
      markdown={`
# Instant Postgres, Zero Setup

Spinning up a Prisma Postgres database in ${preferences.defaultRegion}

This will only take a few seconds!

---

## 🚀 What You'll Get

✅ **Free to start** - 200,000 operations a month and 2 GB of storage on the Free plan  
✅ **Autoscaling** - No instance to size or upgrade  
✅ **Connection pooling built in** - Works with any Postgres client  
✅ **Pairs with Prisma ORM** - Type-safe queries and migrations  
✅ **Host your app next to it** - Deploy Node.js, Bun or Next.js apps on Prisma Compute

---

**Prisma Postgres** • [prisma.io/postgres](https://www.prisma.io/postgres?${UTM})
`}
    />
  );
}
