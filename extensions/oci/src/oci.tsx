import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import * as common from "oci-common";
import { createContext, useContext } from "react";

type ProviderContextType = {
  provider: common.ConfigFileAuthenticationDetailsProvider;
};
const ProviderContext = createContext<ProviderContextType>({} as ProviderContextType);

export const useProvider = () => useContext(ProviderContext);

export function OCIProvider({ children }: { children: React.ReactNode }) {
  try {
    const provider = new common.ConfigFileAuthenticationDetailsProvider();
    return <ProviderContext.Provider value={{ provider }}>{children}</ProviderContext.Provider>;
  } catch {
    return (
      <Detail
        navigationTitle="Oracle Cloud - Provider Error"
        markdown={`## Error: \n\n Can't load the default config from \`~/.oci/config\` or \`~/.oraclebmc/config\` because it does not exist or it's not a file. For more info about config file and how to get required information, see https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm for more info on OCI configuration files. \n\n > TIP: Check extension README!`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              icon={getFavicon("https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm", {
                fallback: Icon.Globe,
              })}
              url="https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm"
            />
          </ActionPanel>
        }
      />
    );
  }
}

export { common };
