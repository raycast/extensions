import { Detail, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { withToast } from "../utils";
import { useScoop } from "../hooks/scoopHooks";
import { ScoopPackageDetails } from "../types/index.types";

export function ScoopInfo({
  packageName,
  isInstalled,
  onAction,
}: {
  packageName: string;
  isInstalled: boolean;
  onAction?: () => void;
}) {
  const [details, setDetails] = useState<ScoopPackageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();
  const scoop = useScoop();

  useEffect(() => {
    scoop.cat(packageName).then((data) => {
      setDetails(data);
      setIsLoading(false);
    });
  }, [packageName]);

  const markdown = details ? `# ${details.Name}\n${details.Description || ""}` : `Fetching info...`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        details && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Version" text={details.Version} />
            {details.Homepage && (
              <Detail.Metadata.Link title="Homepage" text={details.Homepage} target={details.Homepage} />
            )}
            {details.License && <Detail.Metadata.Label title="License" text={details.License} />}
            {details.Binaries && (
              <Detail.Metadata.Label title="Binaries" text={details.Binaries.replace(/\s*\|\s*/g, ", ")} />
            )}
            {details.Notes && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="Notes" text={details.Notes} />
              </>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {isInstalled ? (
            <Action
              title="Uninstall Package"
              style={Action.Style.Destructive}
              onAction={() =>
                withToast(
                  async () => {
                    await scoop.uninstall(packageName);
                    onAction?.();
                    pop();
                  },
                  {
                    loading: `Uninstalling ${packageName}...`,
                    success: `${packageName} has been uninstalled.`,
                    failure: `Failed to uninstall ${packageName}.`,
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
                    await scoop.install(packageName);
                    onAction?.();
                    pop();
                  },
                  {
                    loading: `Installing ${packageName}...`,
                    success: `${packageName} has been installed.`,
                    failure: `Failed to install ${packageName}.`,
                  },
                )
              }
            />
          )}
          {details?.Homepage && <Action.OpenInBrowser url={details.Homepage} />}
          {details && <Action.CopyToClipboard title="Copy Info as JSON" content={JSON.stringify(details, null, 2)} />}
        </ActionPanel>
      }
    />
  );
}
