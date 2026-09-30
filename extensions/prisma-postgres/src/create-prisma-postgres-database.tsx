import { ActionPanel, Action, Detail, getPreferenceValues } from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import { useState, useMemo } from "react";

type PrismaApiResponse = {
  data: {
    id: string;
    database: {
      id: string;
      name: string;
      region: {
        id: string;
      };
      apiKeys: Array<{
        directConnection: {
          user: string;
          pass: string;
          host: string;
          port: number;
          database: string;
        };
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

export default function Command() {
  const preferences = getPreferenceValues<{ defaultRegion: string }>();
  const [databaseHistory, setDatabaseHistory] = useCachedState<DatabaseInfo[]>("prisma-postgres-history", []);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);

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
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Database creation failed: ${error}`);
      }
      return (await response.json()) as PrismaApiResponse;
    },
    onData: async (result) => {
      try {
        if (!result.data) {
          throw new Error("Invalid response from database service");
        }

        const projectId = result.data.id;
        const database = result.data.database;
        const dbName = database.name;
        const dbRegion = database.region?.id;
        const directConnDetails = database.apiKeys?.[0]?.directConnection;

        if (!directConnDetails) {
          throw new Error("Connection details not available");
        }

        const directUser = encodeURIComponent(directConnDetails.user);
        const directPass = encodeURIComponent(directConnDetails.pass);
        const directHost = directConnDetails.host;
        const directPort = directConnDetails.port ? `:${directConnDetails.port}` : "";
        const directDbName = directConnDetails.database || "postgres";

        const connectionString = `postgresql://${directUser}:${directPass}@${directHost}${directPort}/${directDbName}?sslmode=require`;
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
      } catch {
        setHasExecuted(true);
      }
    },
    onError: () => {
      setHasExecuted(true);
    },
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

Want to keep it? Claim via this link for free:

${databaseInfo.claimUrl}

---

**Prisma Postgres** • Not another AWS wrapper
[Learn more →](https://www.prisma.io/postgres)
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

  return (
    <Detail
      isLoading={true}
      markdown={`
# Instant Postgres, Zero Setup

Spinning up production-ready Postgres db in ${preferences.defaultRegion}

This will only take a few seconds!

---

## 🚀 What You'll Get

✅ **Serverless, without Compromises** - Scale to zero and back up instantly  
✅ **Edge-Optimized** - Built-in global connection pooling  
✅ **Production-Ready** - Automatic backups and scaling  
✅ **Works with Prisma ORM** - Out of the box integration  
✅ **Runs on bare metal** - Unikernel tech FTW!

---

**Prisma Postgres** • [prisma.io/postgres](https://www.prisma.io/postgres)
`}
    />
  );
}
