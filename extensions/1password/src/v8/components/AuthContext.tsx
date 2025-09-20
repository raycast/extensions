import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  List,
  open,
  Clipboard,
  PopToRootType,
  showToast,
  Toast,
  environment,
} from "@raycast/api";
import {
  checkZsh,
  errorRegex,
  getSignInStatus,
  CommandLineMissingError,
  ZshMissingError,
  ZSH_PATH,
  signIn,
  useAccounts,
  getCliPath,
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

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getSignInStatus());
  const [zshMissing] = useState<boolean>(!checkZsh());
  const [accountSelected, setAccountSelected] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { data, error, isLoading } = useAccounts(!accountSelected);
  const raycastProtocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";

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
          title: "Copy logs",
          onAction: async (toast) => {
            await Clipboard.copy((error as Error).message);
            toast.hide();
          },
        };
      }
    }
  };

  const authenticate = async () => {
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Authenticating...",
    });
    try {
      if (!ZSH_PATH) {
        throw new ZshMissingError("Zsh Binary Path Missing!");
      }
      if (!getCliPath()) {
        throw new CommandLineMissingError("1Password CLI is missing! Please install it before use.");
      }
      signIn();
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

      const errorMessageMatches = err.message.match(errorRegex);
      if (errorMessageMatches && errorMessageMatches[1]) {
        setErrorMessage(errorMessageMatches[1]);
      } else {
        setErrorMessage(err.message);
      }

      if (err.message.includes("multiple accounts found")) return setAccountSelected(false);
      toast.style = Toast.Style.Failure;
      toast.title = "Error Authenticating.";
    } finally {
      await open(raycastProtocol); // Password prompt causes Raycast to close, so we reopen it here
    }
  };

  useMemo(async () => {
    if (!isAuthenticated && !zshMissing) {
      authenticate();
    }
  }, [isAuthenticated]);

  if (!accountSelected) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Sign In" icon={Icon.Key} onSubmit={onSubmit} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="account" title="Account" autoFocus>
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

  if (!isAuthenticated)
    return (
      <List>
        <List.EmptyView
          title={"Authentication Required"}
          description={errorMessage || "Please authenticate using the requested method to proceed."}
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action key="reload-view" title="Reload" icon={Icon.Repeat} onAction={() => authenticate()} />
            </ActionPanel>
          }
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
