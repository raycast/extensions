/**
 * "Install Version…" subview: lists available versions (newest first),
 * installs the chosen one. Version-specific installs always add a blocking
 * pin afterwards — disclosed in the action title.
 */

import { useEffect, useState } from "react";

import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";

import { showPackageVersions } from "../cli/commands";
import { operationTitle } from "../core/feedback";
import { useOperation } from "../hooks/useOperation";
import { type PackageInfo } from "../utils/packages";

interface InstallVersionListProps {
  pkg: PackageInfo;
}

function InstallVersionList({ pkg }: InstallVersionListProps) {
  const [versions, setVersions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();
  const { gate, launchDetached, cancelActive } = useOperation();

  useEffect(() => {
    const controller = new AbortController();
    showPackageVersions(pkg.id, pkg.source, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setVersions(result?.versions ?? []);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          void showToast({
            style: Toast.Style.Failure,
            title: "Failed to load versions",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      });
    return () => controller.abort();
  }, [pkg.id, pkg.source]);

  const busy = gate.status === "busy";

  return (
    <List isLoading={isLoading} navigationTitle={`Install ${pkg.name}`} searchBarPlaceholder="Filter versions…">
      {!isLoading && versions.length === 0 && (
        <List.EmptyView
          title="No Versions Found"
          description="WinGet reports no versions for this package"
          icon={Icon.XMarkCircle}
        />
      )}
      {versions.length > 0 && (
        <List.Section title={`Available Versions (${versions.length})`}>
          {versions.map((version, index) => (
            <List.Item
              key={version}
              title={version}
              accessories={index === 0 ? [{ tag: { value: "Latest", color: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  {busy ? (
                    <Action title="Cancel Operation" icon={Icon.XMarkCircle} onAction={() => void cancelActive()} />
                  ) : (
                    <Action
                      title="Install and Pin Version"
                      icon={Icon.Plus}
                      onAction={async () => {
                        const launched = await launchDetached({
                          kind: "install-version",
                          title: `${operationTitle("install", pkg.name)} ${version}`,
                          target: {
                            id: pkg.id,
                            name: pkg.name,
                            source: pkg.source,
                          },
                          version,
                        });
                        // A dispatched launch pops to root by itself; on a
                        // busy-rejection keep the user where they were.
                        if (launched) {
                          pop();
                        }
                      }}
                    />
                  )}
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Version" content={version} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export { InstallVersionList };
