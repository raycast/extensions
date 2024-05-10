import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { closeMainWindow, Icon, List, open, PopToRootType, showToast, Toast } from "@raycast/api";
import childProcess from "node:child_process";
import { capitalizeWords, checkZsh, CLI_PATH, errorRegex, getSignInStatus, ZshMissingError, ZSH_PATH } from "../utils";
import { Error as ErrorGuide } from "./Error";

interface AuthContextType {
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getSignInStatus());
  const [zshMissing] = useState<boolean>(!checkZsh());

  useMemo(async () => {
    if (!isAuthenticated && !zshMissing) {
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Authenticating...",
      });
      try {
        if (!ZSH_PATH) {
          throw new ZshMissingError("Zsh Binary Path Missing!");
        }
        childProcess.execSync(`${CLI_PATH} signin`, { shell: ZSH_PATH });
        setIsAuthenticated(true);
        toast.style = Toast.Style.Success;
        toast.title = "Authenticated!";
        return;
      } catch (err) {
        let errorMessage;
        toast.style = Toast.Style.Failure;
        if (!(err instanceof Error)) {
          toast.title = "Error Authenticating.";
          toast.message = String(err);
          return;
        }

        const errorMessageMatches = err.message.match(errorRegex);
        if (errorMessageMatches && errorMessageMatches[1]) {
          errorMessage = errorMessageMatches[1];
        } else {
          return (toast.title = err.message);
        }

        return (toast.title = capitalizeWords(errorMessage));
      } finally {
        await open("raycast://"); // Password prompt causes Raycast to close, so we reopen it here
      }
    }
  }, [isAuthenticated]);

  if (zshMissing) return <ErrorGuide />;

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
