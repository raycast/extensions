import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  openExtensionPreferences,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { checkFnmInstalled, getRemoteVersions, installVersion, getFnmPath, RemoteVersion } from "./utils/fnm";

interface InstallFormProps {
  onInstall: (version: string) => void;
  prefilledVersion?: string;
}

function InstallForm({ onInstall, prefilledVersion }: InstallFormProps) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Install"
            icon={Icon.Download}
            onSubmit={(values: { version: string }) => {
              onInstall(values.version);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="version"
        title="Version"
        placeholder="e.g., 18.17.0, 20, lts, latest"
        defaultValue={prefilledVersion}
        info="Enter a specific version (e.g., 18.17.0), major version (e.g., 20), or alias (lts, latest)"
      />
    </Form>
  );
}

export default function InstallVersion(props: { arguments?: { version?: string } }) {
  const [versions, setVersions] = useState<RemoteVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fnmInstalled, setFnmInstalled] = useState(true);
  const { push } = useNavigation();

  const prefilledVersion = props.arguments?.version;

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    setIsLoading(true);

    const installed = await checkFnmInstalled();
    setFnmInstalled(installed);

    if (!installed) {
      const fnmPath = getFnmPath();
      await showToast({
        style: Toast.Style.Failure,
        title: "fnm 未找到",
        message: fnmPath.includes("/") ? `路径 ${fnmPath} 不存在,请检查配置` : "请安装 fnm 或在设置中配置路径",
      });
      setIsLoading(false);
      return;
    }

    const remoteVersions = await getRemoteVersions();
    // Get latest 50 versions to avoid overwhelming the list
    setVersions(remoteVersions.slice(0, 50));
    setIsLoading(false);
  }

  async function handleInstall(version: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing Node.js ${version}...`,
    });

    const result = await installVersion(version);

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = `Node.js ${version} installed successfully`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = result.message;
    }
  }

  // If a version is provided as argument, show the form directly
  if (prefilledVersion) {
    return <InstallForm onInstall={handleInstall} prefilledVersion={prefilledVersion} />;
  }

  if (!fnmInstalled) {
    const fnmPath = getFnmPath();
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="fnm 未找到"
          description={
            fnmPath.includes("/")
              ? `配置的路径 ${fnmPath} 不存在\n请检查扩展设置中的路径配置`
              : "请先安装 fnm 或在扩展设置中配置 fnm 路径\n\n安装方法: brew install fnm"
          }
          actions={
            <ActionPanel>
              <Action title="打开扩展设置" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Node.js versions...">
      <List.Section title="Quick Install">
        <List.Item
          icon={{ source: Icon.Download, tintColor: Color.Blue }}
          title="Install Latest LTS"
          subtitle="Recommended for most users"
          actions={
            <ActionPanel>
              <Action title="Install Lts" icon={Icon.Download} onAction={() => handleInstall("lts")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Download, tintColor: Color.Green }}
          title="Install Latest"
          subtitle="Latest stable version"
          actions={
            <ActionPanel>
              <Action title="Install Latest" icon={Icon.Download} onAction={() => handleInstall("latest")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
          title="Install Custom Version"
          subtitle="Enter a specific version number"
          actions={
            <ActionPanel>
              <Action
                title="Enter Version"
                icon={Icon.Pencil}
                onAction={() => push(<InstallForm onInstall={handleInstall} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Available Versions (Latest 50)">
        {versions.map((version) => (
          <List.Item
            key={version.version}
            icon={Icon.Circle}
            title={version.version}
            accessories={[...(version.isLts ? [{ tag: { value: "lts", color: Color.Orange } }] : [])]}
            actions={
              <ActionPanel>
                <Action
                  title="Install This Version"
                  icon={Icon.Download}
                  onAction={() => handleInstall(version.version)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
