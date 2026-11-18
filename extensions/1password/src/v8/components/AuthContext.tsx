import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  Icon,
  List,
  open,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

import {
  authorizeWithApp,
  checkZsh,
  CommandLineMissingError,
  extractOpErrorMessage,
  getCliPath,
  getSignInStatus,
  hasActiveSession,
  isWindows,
  signIn,
  useAccounts,
  ZSH_PATH,
  ZshMissingError,
} from "../utils";
import { Error as ErrorGuide } from "./Error";
import { Guide } from "./Guide";

interface AuthContextType {
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  try {
    getCliPath();
  } catch {
    return <Guide />;
  }

  // Lazy: called directly, this would shell out to the CLI on every render.
  // On macOS the app probe can raise the unlock prompt, so `authenticate` runs it with the window closed.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    isWindows ? getSignInStatus() : hasActiveSession(),
  );
  const [zshMissing] = useState<boolean>(!checkZsh());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(!isAuthenticated);
  const [accountSelected, setAccountSelected] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { data, error, isLoading } = useAccounts(!accountSelected);
  const raycastProtocol = `${process.env.RAYCAST_SCHEME ?? "raycast"}://`;
  const onSubmit = async (values: Form.Values) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Signing in...",
    });

    try {
      signIn(`--account ${values.account}`);
      setIsAuthenticated(true);
      setAccountSelected(true);

      toast.style = Toast.Style.Success;
      toast.title = "Signed in";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to sign in";
      if (error instanceof Error) {
        toast.message = error.message;
        toast.primaryAction = {
          onAction: async (toast) => {
            await Clipboard.copy((error as Error).message);
            toast.hide();
          },
          title: "Copy logs",
        };
      }
    }
  };
  const authenticate = async () => {
    setIsAuthenticating(true);
    if (!isWindows) {
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Authenticating...",
    });

    try {
      if (!isWindows && !ZSH_PATH) {
        throw new ZshMissingError("Zsh Binary Path Missing!");
      }

      if (!getCliPath()) {
        throw new CommandLineMissingError("1Password CLI is missing! Please install it before use.");
      }

      // Windows already tried the app in the initial check.
      if (isWindows || !authorizeWithApp()) {
        signIn();
      }
      setIsAuthenticated(true);
      setAccountSelected(true);
      toast.style = Toast.Style.Success;
      toast.title = "Authenticated!";
      return;
    } catch (err) {
      if (!(err instanceof Error)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error Authenticating.";
        toast.message = String(err);
        return;
      }

      setErrorMessage(extractOpErrorMessage(err.message));

      if (err.message.includes("multiple accounts found")) return setAccountSelected(false);
      toast.style = Toast.Style.Failure;
      toast.title = "Error Authenticating.";
    } finally {
      setIsAuthenticating(false);
      await open(raycastProtocol); // Password prompt causes Raycast to close, so we reopen it here
    }
  };

  // Development mode runs mount effects twice, which would run the whole sign-in flow twice.
  const authenticationStarted = useRef(false);
  useEffect(() => {
    if (!isAuthenticated && !zshMissing && !authenticationStarted.current) {
      authenticationStarted.current = true;
      authenticate();
    }
  }, [isAuthenticated, zshMissing]);

  if (!accountSelected) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.Key} onSubmit={onSubmit} title="Sign in" />
          </ActionPanel>
        }
        isLoading={isLoading}
      >
        <Form.Dropdown autoFocus id="account" title="Account">
          {(data && !error ? data : []).map((account) => (
            <Form.Dropdown.Item
              key={account.account_uuid}
              title={`${account.url} - ${account.email}`}
              value={account.account_uuid}
            />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }

  if (zshMissing) return <ErrorGuide />;

  if (isAuthenticating) return <List isLoading />;

  if (!isAuthenticated)
    return (
      <List>
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.Repeat} key="reload-view" onAction={() => authenticate()} title="Reload" />
              {errorMessage ? (
                <Action.CopyToClipboard
                  content={errorMessage}
                  icon={Icon.Clipboard}
                  key="copy-error"
                  title="Copy Error Details"
                />
              ) : null}
            </ActionPanel>
          }
          description={errorMessage || "Please authenticate using the requested method to proceed."}
          icon={Icon.Key}
          title={"Authentication Required"}
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
