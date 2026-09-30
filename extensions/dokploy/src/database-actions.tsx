import { Action, ActionPanel, Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { externalConnectionUri, internalConnectionUri } from "./connection-string";
import { DatabaseDetail, DatabaseKind, ErrorResult, Server } from "./interfaces";

const ID_FIELDS: Record<DatabaseKind, string> = {
  mariadb: "mariadbId",
  mongo: "mongoId",
  mysql: "mysqlId",
  postgres: "postgresId",
  redis: "redisId",
};

interface DatabaseActionsProps {
  url: string;
  headers: Record<string, string>;
  kind: DatabaseKind;
  service: { id: string; name: string };
}

type Scope = "internal" | "external";

/**
 * Connection actions for a database service.
 *
 * Credentials are fetched when an action runs rather than when the list renders: `<kind>.one`
 * returns the password in the clear, and a list of several databases has no business holding all
 * of their passwords in memory because one of them might get copied.
 */
export function DatabaseActions({ url, headers, kind, service }: DatabaseActionsProps) {
  async function getDatabase(): Promise<DatabaseDetail> {
    const response = await fetch(`${url}${kind}.one?${ID_FIELDS[kind]}=${service.id}`, { headers });
    if (!response.ok) {
      const err = (await response.json()) as ErrorResult;
      throw new Error(err.message);
    }
    return (await response.json()) as DatabaseDetail;
  }

  async function resolveExternalHost(serverId?: string | null): Promise<string | undefined> {
    if (serverId) {
      const response = await fetch(`${url}server.one?serverId=${serverId}`, { headers });
      if (!response.ok) return undefined;
      const server = (await response.json()) as Server;
      return server.ipAddress ?? undefined;
    }
    const response = await fetch(`${url}settings.getIp`, { headers });
    if (!response.ok) return undefined;
    const ip = (await response.json()) as string;
    return typeof ip === "string" && ip.length > 0 ? ip : undefined;
  }

  async function copyUri(scope: Scope) {
    const toast = await showToast(Toast.Style.Animated, "Reading credentials…");
    try {
      const database = await getDatabase();

      if (scope === "internal") {
        const uri = internalConnectionUri(kind, database);
        if (!uri) {
          toast.style = Toast.Style.Failure;
          toast.title = "No Connection String";
          toast.message = `Dokploy has not finished setting ${service.name} up yet.`;
          return;
        }
        await copyConcealed(
          uri,
          toast,
          "Copied Internal Connection String",
          "Reachable from other services on this Dokploy instance.",
        );
        return;
      }

      if (!database.externalPort) {
        toast.style = Toast.Style.Failure;
        toast.title = "Not Published";
        toast.message = `${service.name} has no external port. Add one in Dokploy to reach it from outside the server.`;
        return;
      }

      const host = await resolveExternalHost(database.serverId);
      if (!host) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Server Address";
        toast.message = "This Dokploy instance has no IP address set, so an external URL cannot be built.";
        return;
      }

      const uri = externalConnectionUri(kind, database, host);
      if (!uri) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Connection String";
        toast.message = `Dokploy has not finished setting ${service.name} up yet.`;
        return;
      }

      await copyConcealed(uri, toast, "Copied External Connection String", `Port ${database.externalPort} on ${host}.`);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Read Credentials";
      toast.message = `${error}`;
    }
  }

  async function copyPassword() {
    const toast = await showToast(Toast.Style.Animated, "Reading credentials…");
    try {
      const database = await getDatabase();
      if (!database.databasePassword) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Password";
        toast.message = `${service.name} has no password set.`;
        return;
      }
      await copyConcealed(database.databasePassword, toast, "Copied Password");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Read Credentials";
      toast.message = `${error}`;
    }
  }

  return (
    <ActionPanel.Section title="Connection">
      <Action
        title="Copy Internal Connection String"
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => copyUri("internal")}
      />
      <Action
        title="Copy External Connection String"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={() => copyUri("external")}
      />
      <Action title="Copy Password" icon={Icon.Key} onAction={copyPassword} />
    </ActionPanel.Section>
  );
}

/** `concealed` keeps the value out of Raycast's clipboard history - a connection string is a password with a hostname attached. */
async function copyConcealed(value: string, toast: Toast, title: string, message?: string): Promise<void> {
  await Clipboard.copy(value, { concealed: true });
  toast.style = Toast.Style.Success;
  toast.title = title;
  if (message) toast.message = message;
}
