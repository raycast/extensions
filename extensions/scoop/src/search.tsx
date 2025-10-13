import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { ScoopInfo } from "./components/ScoopInfo";
import { withToast } from "./utils";
import { useScoop } from "./hooks/scoopHooks";
import { ScoopPackage } from "./types/index.types";

export default function SearchCommand() {
  const scoop = useScoop();
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<ScoopPackage[]>([]);
  const [installedPackages, setInstalledPackages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    scoop.listInstalled().then((pkgs) => {
      setInstalledPackages(new Set(pkgs.map((p) => p.Name)));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const search = async () => {
      if (query) {
        setIsLoading(true);
        const pkgs = await scoop.search(query);
        if (!cancelled) {
          setPackages(pkgs);
          setIsLoading(false);
        }
      } else {
        setPackages([]);
        setIsLoading(false);
      }
    };
    search();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const refreshInstalled = async () => {
    setIsLoading(true);
    const pkgs = await scoop.listInstalled();
    setInstalledPackages(new Set(pkgs.map((p) => p.Name)));
    setIsLoading(false);
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for Scoop packages..."
      throttle
    >
      {packages.map((pkg) => {
        const isInstalled = installedPackages.has(pkg.Name);
        return (
          <List.Item
            key={`${pkg.Name}-${pkg.Source}`}
            title={pkg.Name}
            subtitle={pkg.Binaries}
            accessories={[
              { text: pkg.Version },
              { text: pkg.Source },
              isInstalled ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Installed" } : {},
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Info"
                  target={<ScoopInfo packageName={pkg.Name} isInstalled={isInstalled} onAction={refreshInstalled} />}
                />
                {isInstalled ? (
                  <Action
                    title="Uninstall Package"
                    style={Action.Style.Destructive}
                    onAction={() =>
                      withToast(
                        async () => {
                          await scoop.uninstall(pkg.Name);
                          await refreshInstalled();
                        },
                        {
                          loading: `Uninstalling ${pkg.Name}...`,
                          success: `${pkg.Name} has been uninstalled.`,
                          failure: `Failed to uninstall ${pkg.Name}.`,
                        },
                      )
                    }
                  />
                ) : (
                  <Action
                    title="Install Package"
                    onAction={() =>
                      withToast(
                        async () => {
                          await scoop.install(pkg.Name);
                          await refreshInstalled();
                        },
                        {
                          loading: `Installing ${pkg.Name}...`,
                          success: `${pkg.Name} has been installed.`,
                          failure: `Failed to install ${pkg.Name}.`,
                        },
                      )
                    }
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
