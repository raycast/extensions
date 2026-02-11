import { ActionPanel, Icon, List, Action, Toast, showToast, confirmAlert, Alert } from "@raycast/api";
import getPicGoContext from "./util/context";
import { useMemo, useState } from "react";
import ConfigEditForm from "./components/ConfigEditForm";

export default function Command() {
    const {
        getInstalledPluginNameList,
        getPlugin,
        updatePlugin,
        uninstallPlugin,
        getUploaderConfigItemDetails,
        getUploaderTypeList,
        createOrUpdateConfig,
        renameConfig,
    } = getPicGoContext();

    const [error, setError] = useState<Error>();
    const [updated, setUpdated] = useState<boolean>(false);
    const installedPlugins = useMemo(() => {
        return getInstalledPluginNameList()
            .map((n) => {
                return { name: n, ...getPlugin(n) };
            })
            .filter(Boolean);
    }, [updated]);

    const handleUpdate = async (name: string) => {
        const toast = await showToast(Toast.Style.Animated, `Installing ${name}`);
        try {
            const res = await updatePlugin([name]);
            if (!res.success) {
                throw new Error(`Failed to update '${name}'`, {
                    cause: res.body,
                });
            }
            toast.style = Toast.Style.Success;
            toast.message = `${name} updated.`;
        } catch (e) {
            setError(e as Error);
        } finally {
            toast.hide();
            setUpdated(!updated);
        }
    };

    const handleUninstall = async (name: string) => {
        const toast = await showToast(Toast.Style.Animated, `Uninstalling ${name}`);
        try {
            const res = await uninstallPlugin([name]);
            if (!res.success) {
                throw new Error(`Failed to uninstall '${name}'`, {
                    cause: res.body,
                });
            }
            toast.style = Toast.Style.Success;
            toast.message = `${name} uninstalled.`;
        } catch (e) {
            setError(e as Error);
        } finally {
            toast.hide();
            setUpdated(!updated);
        }
    };

    return (
        <List>
            {installedPlugins.map((p) => {
                return (
                    <List.Item
                        title={p.name.replace("picgo-plugin-", "")}
                        key={p.name}
                        icon={Icon.Plug}
                        actions={
                            <ActionPanel>
                                <Action.Push
                                    title="Add Config"
                                    icon={Icon.Plus}
                                    target={
                                        <ConfigEditForm
                                            type={p.uploader ?? p.name.replace("picgo-plugin-", "")}
                                            getConfigItems={getUploaderConfigItemDetails}
                                            getUploaderTypeList={getUploaderTypeList}
                                            createOrUpdateConfig={createOrUpdateConfig}
                                            renameConfig={renameConfig}
                                        />
                                    }
                                ></Action.Push>
                                <Action
                                    title="Update Plugin"
                                    icon={Icon.Tag}
                                    onAction={() => handleUpdate(p.name)}
                                ></Action>
                                <Action
                                    title="Uninstall Plugin"
                                    icon={Icon.Trash}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                                    style={Action.Style.Destructive}
                                    onAction={async () => {
                                        await confirmAlert({
                                            title: `Are you sure you want to uninstall plugin '${p.name}'?`,
                                            message: "This action cannot be undone.",
                                            primaryAction: {
                                                title: "Uninstall",
                                                style: Alert.ActionStyle.Destructive,
                                                onAction: () => {
                                                    handleUninstall(p.name);
                                                },
                                            },
                                        });
                                    }}
                                />
                            </ActionPanel>
                        }
                    ></List.Item>
                );
            })}
        </List>
    );
}
