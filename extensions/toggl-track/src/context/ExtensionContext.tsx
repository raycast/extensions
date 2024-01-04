import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { List, Icon, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";

interface ExtensionContextProps {
  setTokenValidity: (valid: boolean) => void;
}

const ExtensionContext = createContext<ExtensionContextProps>({ setTokenValidity: () => {} });

export const useExtensionContext = () => useContext(ExtensionContext);

export const ExtensionContextProvider = ({ children }: { children: JSX.Element }) => {
  const [isValidToken, setIsValidToken] = useState(true);
  const setTokenValidity = useCallback((valid: boolean) => setIsValidToken(valid), []);
  const context = useMemo<ExtensionContextProps>(() => ({ setTokenValidity }), [setIsValidToken]);

  if (!isValidToken)
    return (
      <List
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <List.Item
          icon={Icon.ExclamationMark}
          title="Invalid API Key Detected"
          accessories={[{ text: `Go to Extensions → Toggl Track` }]}
        />
      </List>
    );

  return <ExtensionContext.Provider value={context}>{children}</ExtensionContext.Provider>;
};
