import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { PackageVersionList } from "./PackageVersionList";
import { execAsync } from "./utils/execAsync";

export const AvailableTool = ({
  setIsLoading,
  refetchInstalledTools,
  tool,
}: AvailableToolProps) => {
  const { push } = useNavigation();
  return (
    <List.Item
      title={tool}
      keywords={[tool]}
      actions={
        <ActionPanel>
          <Action
            title={`Install ${tool}`}
            onAction={async () => {
              setIsLoading(true);
              try {
                await execAsync(`mise use ${tool}@latest`);
                refetchInstalledTools();
                showToast({
                  title: `${tool} installed successfully`,
                  style: Toast.Style.Success,
                });
              } catch {
                showToast({
                  title: "Installation failed",
                  style: Toast.Style.Failure,
                });
              }
              setIsLoading(false);
            }}
          />
          <Action
            title="Install Specific Version"
            onAction={() =>
              push(
                <PackageVersionList
                  packageName={tool}
                  refetchInstalledTools={refetchInstalledTools}
                />,
              )
            }
          />
        </ActionPanel>
      }
    />
  );
};

type AvailableToolProps = {
  tool: string;
  refetchInstalledTools: () => Promise<void>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};
