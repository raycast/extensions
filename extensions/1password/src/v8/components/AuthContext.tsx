import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { closeMainWindow, Icon, List, PopToRootType } from "@raycast/api";
import childProcess from "node:child_process";
import { CLI_PATH, getSignInStatus } from "../utils";

interface AuthContextType {
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated] = useState<boolean>(getSignInStatus());

  useMemo(async () => {
    if (!isAuthenticated) {
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      childProcess.execSync(`${CLI_PATH} signin`);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated)
    return (
      <List>
        <List.EmptyView
          title={"Authentication Required"}
          description={"Please authenticate using the requested method to proceed."}
          icon={Icon.Key}
        />
      </List>
    );

  return <AuthContext.Provider value={{ isAuthenticated }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
