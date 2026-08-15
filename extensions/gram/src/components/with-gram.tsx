import fs from "fs";
import { Application, Detail } from "@raycast/api";
import { createContext, useContext } from "react";
import { getGramApp, getGramCliPath, getGramDbPath } from "../lib/gram";
import { usePromise } from "@raycast/utils";
import { getGramWorkspaceDbVersion, MIN_SUPPORTED_DB_VERSION } from "../lib/db";

interface GramContextType {
  app: Application;
  workspaceDbVersion: number;
  dbPath: string;
  cliPath: string | null;
}

const GramContext = createContext<GramContextType | undefined>(undefined);

function useGram() {
  const dbPath = getGramDbPath();
  const cliPath = getGramCliPath();

  const { data, isLoading } = usePromise(async () => {
    const [app, dbVersionInfo] = await Promise.all([getGramApp(), getGramWorkspaceDbVersion(dbPath)]);
    return {
      app,
      isDbSupported: dbVersionInfo.supported,
      workspaceDbVersion: dbVersionInfo.version,
    };
  });

  return {
    isLoading,
    app: data?.app,
    isDbSupported: !!data?.isDbSupported,
    workspaceDbVersion: data?.workspaceDbVersion || 0,
    dbPath,
    cliPath,
  };
}

export const withGram = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { app, isDbSupported, workspaceDbVersion, dbPath, cliPath, isLoading } = useGram();

    if (!app) {
      return <Detail isLoading={isLoading} markdown={isLoading ? "" : "Gram not detected"} />;
    }

    if (!dbPath || !fs.existsSync(dbPath)) {
      return <Detail markdown="Gram Workspaces Database file not found" />;
    }

    if (!isDbSupported) {
      return (
        <Detail
          markdown={`## Unsupported Gram Version

Your Gram database schema version (${workspaceDbVersion}) is not supported.

This extension requires Gram with database schema version **${MIN_SUPPORTED_DB_VERSION}** or higher.

Please update Gram to the latest version.`}
        />
      );
    }

    return (
      <GramContext.Provider
        value={{
          app,
          workspaceDbVersion,
          dbPath,
          cliPath,
        }}
      >
        <Component {...props} />
      </GramContext.Provider>
    );
  };
};

export function useGramContext() {
  const context = useContext(GramContext);
  if (!context) {
    throw new Error("useGramContext must be used within a GramContext.Provider");
  }
  return context;
}
