import { useEffect, useState } from "react";

import {
  type ApiToken,
  type Database,
  listAPITokens,
  listDatabases,
  DatabaseUsage,
  getDatabaseUsage,
  Organization,
  listOrganizations,
  Group,
  listGroups,
  Table,
} from "../utils/api";
import { getDatabaseToken } from "../utils/authorize";
import { createClient } from "@libsql/client/web";

export function useAPITokens() {
  const [data, setData] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const revalidate = async () => {
    try {
      setIsLoading(true);
      const tokens = await listAPITokens();
      setData(tokens);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    revalidate();
  }, []);

  return { data, isLoading, error, revalidate };
}

export function useOrganizations() {
  const [data, setData] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const revalidate = async () => {
    try {
      setIsLoading(true);
      const organizations = await listOrganizations();
      setData(organizations);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    revalidate();
  }, []);

  return { data, isLoading, error, revalidate };
}

export function useGroups(organizationName?: string) {
  const [data, setData] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const revalidate = async (organizationName: string) => {
    try {
      setIsLoading(true);
      const groups = await listGroups(organizationName);
      setData(groups);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationName) revalidate(organizationName);
  }, []);

  return { data, isLoading, error, revalidate };
}

export function useDatabases() {
  const [data, setData] = useState<{ [organizationName: string]: Database[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const revalidate = async () => {
    try {
      setIsLoading(true);
      const organizations = await listOrganizations();

      const databases = await Promise.all(organizations.map((o) => listDatabases(o.slug)));
      setData(
        organizations.reduce(
          (acc, curr, i) => (acc[curr.slug] = databases[i]) && acc,
          {} as Record<string, Database[]>,
        ),
      );
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    revalidate();
  }, []);

  return { data, isLoading, error, revalidate };
}

export function useDatabaseUsages(organizationName?: string, databaseName?: string) {
  const [data, setData] = useState<Record<string, DatabaseUsage>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const revalidate = async (organizationName: string, databaseName: string) => {
    try {
      setIsLoading(true);
      const usage = await getDatabaseUsage(organizationName, databaseName);
      data[databaseName] = usage;
      setData(data);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (databaseName && organizationName) revalidate(organizationName, databaseName);
  }, []);

  return { data, isLoading, error, revalidate };
}

export async function runQuery<T>(database: Database, query: string) {
  const token = await getDatabaseToken(database);

  const c = createClient({
    url: `libsql://${database.Hostname}`,
    authToken: token,
  });
  const res = await c.execute(query);
  c.close();

  return res.rows as T;
}

export async function listTables(database: Database) {
  const res = await runQuery<Table[]>(database, "SELECT * FROM sqlite_master WHERE type = 'table'");
  return res;
}
