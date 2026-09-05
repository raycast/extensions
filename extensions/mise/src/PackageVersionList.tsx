import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { usePackageVersions } from "./hooks/usePackageVersions";
import { execAsync } from "./utils/execAsync";

export const PackageVersionList = ({
  packageName,
  refetchInstalledTools,
}: PackageVersionListProps) => {
  const packageVersions = usePackageVersions(packageName);
  const { pop } = useNavigation();
  const [isLoading, setisLoading] = useState(false);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search versions for ${packageName}`}
    >
      {packageVersions.map((version) => (
        <List.Item
          key={version}
          title={version.toString()}
          keywords={[version.toString()]}
          actions={
            <ActionPanel>
              <Action
                title={`Install ${packageName}@${version}`}
                onAction={async () => {
                  setisLoading(true);
                  try {
                    await execAsync(`mise use -g ${packageName}@${version}`);
                    showToast({
                      title: `${packageName}@${version} installed successfully`,
                      style: Toast.Style.Success,
                    });
                    refetchInstalledTools();
                    pop();
                  } catch {
                    showToast({
                      title: "Installation failed",
                      style: Toast.Style.Failure,
                    });
                  }
                  setisLoading(false);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

type PackageVersionListProps = {
  packageName: string;
  refetchInstalledTools: () => Promise<void>;
};
