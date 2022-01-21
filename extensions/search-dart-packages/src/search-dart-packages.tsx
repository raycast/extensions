import {
  ActionPanel,
  OpenInBrowserAction,
  List,
  showToast,
  ToastStyle,
  CopyToClipboardAction
} from "@raycast/api";
import { useState } from "react";
import { Package } from "./utils/package.model";
import { Repository } from "./utils/repository";

export default function Command() {
  const endpoint = "https://pub.dev";
  const repository = new Repository(`${endpoint}/api`);

  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onQueryChange = async (query: string) => {
    try {
      setIsLoading(true)
      const packages = await repository.search(query);
      setPackages(packages);
    } catch (e) {
      showToast(ToastStyle.Failure, "Could not fetch packages");
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <List onSearchTextChange={onQueryChange} isLoading={isLoading}>
      {
        packages.map((pkg) => (
          <List.Item
            key={pkg.name}
            id={pkg.name}
            title={pkg.name}
            subtitle={pkg.latest.description}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open in pub.dev">
                  <OpenInBrowserAction url={`${endpoint}/packages/${pkg.name}`} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Info">
                  <CopyToClipboardAction title="Copy version" content={`${pkg.name}: ^${pkg.latest.version}`} />
                  {pkg.latest.documentation ?
                    <OpenInBrowserAction title="Documentation" url={pkg.latest.documentation} /> : null}
                  {pkg.latest.homepage ? <OpenInBrowserAction title="Github" url={pkg.latest.homepage} /> : null}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      }
    </List>
  );
}