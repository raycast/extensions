import { createContext, ReactNode, useMemo, useState } from "react";
import { Detail, List } from "@raycast/api";
import { useSites } from "../hooks/useSites";
import { SiteExcerptData } from "../helpers/site-types";
import { Command } from "../hooks/useCommandPallette";

interface SiteContextInterface {
  sites: SiteExcerptData[];
  selectedCommand: Command | null;
  isLoading: boolean;
  setSelectedCommand: (command: Command | null) => void;
}

const loadingMarkdonw = `
![](comman-palette-loading.svg)
`;

export const SiteContext = createContext<SiteContextInterface>({
  sites: [],
  isLoading: false,
  selectedCommand: null,
  setSelectedCommand: () => {
    return;
  },
});

const SitesView = ({ children }: { children: ReactNode }) => {
  const { sites, isLoading } = useSites();
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const contextValue = useMemo(() => {
    return {
      sites,
      isLoading,
      selectedCommand,
      setSelectedCommand,
    };
  }, [sites, isLoading, selectedCommand, setSelectedCommand]);

  return (
    <SiteContext.Provider value={contextValue}>
      {selectedCommand?.loadingContext ? (
        <Detail markdown={loadingMarkdonw}></Detail>
      ) : (
        <List isLoading={isLoading} searchBarPlaceholder="Search WordPress sites..." throttle>
          {children}
        </List>
      )}
    </SiteContext.Provider>
  );
};

export default SitesView;
