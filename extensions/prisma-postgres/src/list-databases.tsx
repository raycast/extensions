import { List, ActionPanel, Action, Icon, Color, Detail, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useMemo } from "react";

type DatabaseInfo = {
  connectionString: string;
  claimUrl: string;
  deletionDate: string;
  region: string;
  name: string;
  projectId: string;
};

function formatTimeRemaining(deletionDate: string): string {
  const now = new Date();
  const expiry = new Date(deletionDate);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return "Expired";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

function getStatusIcon(deletionDate: string): { source: Icon; tintColor: Color } {
  const now = new Date();
  const expiry = new Date(deletionDate);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  } else if (diff < 3 * 60 * 60 * 1000) {
    return { source: Icon.ExclamationMark, tintColor: Color.Orange };
  } else {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
}

function DatabaseDetail({ database }: { database: DatabaseInfo }) {
  const timeRemaining = formatTimeRemaining(database.deletionDate);
  const statusIcon = getStatusIcon(database.deletionDate);

  let statusText = "✅ Active";
  if (statusIcon.tintColor === Color.Red) {
    statusText = "⚠️ Expired";
  } else if (statusIcon.tintColor === Color.Orange) {
    statusText = "⏰ Expiring Soon";
  }

  const markdown = `
# 🗄️ ${database.name}

**Status:** ${statusText} • ${timeRemaining}

---

## 🔗 Database URL

\`\`\`
${database.connectionString}
\`\`\`

---

## 🎁 Claim URL

Your database will be automatically deleted in 24 hours. Want to keep it? Claim via this link for free:

${database.claimUrl}

---

**Prisma Postgres** • Instant Postgres, Zero Setup  
[Learn more →](https://www.prisma.io/postgres)
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Connection String"
            content={database.connectionString}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Claim Database"
            url={database.claimUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Claim URL"
            content={database.claimUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Project ID"
            content={database.projectId}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [databaseHistory, setDatabaseHistory] = useCachedState<DatabaseInfo[]>("prisma-postgres-history", []);
  const [searchText, setSearchText] = useState("");

  async function handleClearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear All Database History",
      message: "Are you sure you want to clear all database records? This action cannot be undone.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      setDatabaseHistory([]);
    }
  }

  async function handleDeleteDatabase(projectId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Database Record",
      message: "Are you sure you want to remove this database from the list?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      setDatabaseHistory(databaseHistory.filter((db) => db.projectId !== projectId));
    }
  }

  const filteredDatabases = useMemo(() => {
    if (!searchText) return databaseHistory;
    const query = searchText.toLowerCase();
    return databaseHistory.filter(
      (db) =>
        db.name.toLowerCase().includes(query) ||
        db.region.toLowerCase().includes(query) ||
        db.projectId.toLowerCase().includes(query),
    );
  }, [databaseHistory, searchText]);

  return (
    <List isLoading={false} searchBarPlaceholder="Search Databases" onSearchTextChange={setSearchText}>
      {filteredDatabases.length === 0 ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Prisma Postgres Databases Yet"
          description="Create your first database to get started with instant Postgres"
        />
      ) : (
        filteredDatabases.map((db) => {
          const timeRemaining = formatTimeRemaining(db.deletionDate);
          const statusIcon = getStatusIcon(db.deletionDate);
          const expiryDate = new Date(db.deletionDate).toLocaleString();

          return (
            <List.Item
              key={db.projectId}
              icon={statusIcon}
              title={db.name}
              subtitle={`${db.region} • ${timeRemaining}`}
              accessories={[
                { text: expiryDate, tooltip: `Expires on ${expiryDate}` },
                { icon: Icon.Globe, tooltip: "Prisma Postgres" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<DatabaseDetail database={db} />} />
                  <Action.CopyToClipboard
                    title="Copy Connection String"
                    content={db.connectionString}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.OpenInBrowser
                    title="Claim Database"
                    url={db.claimUrl}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Claim URL"
                    content={db.claimUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Project ID"
                    content={db.projectId}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  <Action
                    title="Delete from List"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteDatabase(db.projectId)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleClearHistory}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
