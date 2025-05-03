import fetch from "node-fetch";
import { authorize } from "./authorize";

export type ApiToken = {
  id: string;
  name: string;
};

export type Database = {
  Name: string;
  DbId: string;
  Hostname: string;
  is_schema: boolean;
  schema: string;
  block_reads: boolean;
  block_writes: boolean;
  regions: string[];
  primaryRegion: string;
  type: string;
  hostname: string;
  version: string;
  sleeping: boolean;
  group?: string;
  organization: string;
};

export type DatabaseUsage = {
  database: {
    uuid: string;
    instances: {
      uuid: string;
      usage: {
        rows_read: number;
        rows_written: number;
        storage_bytes: number;
      };
    }[];
    usage: {
      rows_read: number;
      rows_written: number;
      storage_bytes: number;
    };
  };
  instances: Record<string, { rows_read: number; rows_written: number; storage_bytes: number }>;
  total: {
    rows_read: number;
    rows_written: number;
    storage_bytes: number;
  };
};

export type Table = {
  type: string;
  name: string;
  tbl_name: string;
  rootpage: number;
  sql: string;
};

export type Organization = {
  blocked_reads: boolean;
  blocked_writes: boolean;
  name: string;
  overages: boolean;
  slug: string;
  type: "personal" | "team";
};

export type Group = {
  archived: boolean;
  locations: string[];
  name: string;
  primary: string;
  uuid: string;
};

export async function listAPITokens() {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/auth/api-tokens`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  }).then((r) => r.json())) as { tokens: ApiToken[] };

  return res.tokens;
}

export async function revokeAPIToken(tokenName: string) {
  const token = await authorize();
  const res = await fetch(`https://api.turso.tech/v1/auth/api-tokens/${tokenName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  return res;
}

export async function createAPIToken(tokenName: string) {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/auth/api-tokens/${tokenName}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  }).then((r) => r.json())) as { id: string; name: string; token: string };
  return res;
}

export async function listDatabases(organizationName: string) {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/organizations/${organizationName}/databases`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
  }).then((r) => r.json())) as { databases: Omit<Database, "organization">[] };

  return res.databases.map((e) => ({ ...e, organization: organizationName }));
}

export async function getDatabaseUsage(organizationName: string, databaseName: string) {
  const token = await authorize();
  const res = (await fetch(
    `https://api.turso.tech/v1/organizations/${organizationName}/databases/${databaseName}/usage`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    },
  ).then((r) => r.json())) as DatabaseUsage;

  return res;
}

export async function listOrganizations() {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/organizations`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
  }).then((r) => r.json())) as Organization[];

  return res;
}

export async function listGroups(organizationName: string) {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/organizations/${organizationName}/groups`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
  }).then((r) => r.json())) as { groups: Group[] };

  return res.groups;
}

export async function createDatabase(organizationName: string, group: string, name: string) {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/organizations/${organizationName}/databases`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ name, group }),
  }).then((r) => r.json())) as { groups: Group[] };

  return res.groups;
}

export async function deleteDatabase(organizationName: string, databaseName: string) {
  const token = await authorize();
  const res = (await fetch(`https://api.turso.tech/v1/organizations/${organizationName}/databases/${databaseName}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
    method: "DELETE",
  }).then((r) => r.json())) as { database: string };

  return res;
}

export async function createDatabaseToken(organizationName: string, databaseName: string) {
  const token = await authorize();
  const res = (await fetch(
    `https://api.turso.tech/v1/organizations/${organizationName}/databases/${databaseName}/auth/tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    },
  ).then((r) => r.json())) as { jwt: string };

  return res.jwt;
}
