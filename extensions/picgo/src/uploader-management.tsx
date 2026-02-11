import { List, Icon, ActionPanel, Action, confirmAlert, Alert, Color } from "@raycast/api";
import getPicGoContext from "./util/context";
import { IPluginConfig, IUploaderConfigItem } from "picgo";
import ConfigEditForm from "./components/ConfigEditForm";
import { useEffect, useMemo, useState } from "react";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
    const {
        getActiveUploaderType,
        getUploaderConfigItemDetails,
        getActiveConfig,
        getUploaderTypeList,
        getConfigList,
        setActiveConfig,
        copyConfig,
        removeConfig,
        renameConfig,
        createOrUpdateConfig,
        ctx,
    } = getPicGoContext();

    const [error, setError] = useState<Error | undefined>(undefined);
    const [updated, setUpdated] = useState<boolean>(false);

    useEffect(() => {
        if (error) {
            showFailureToast(error, { title: error.name, message: error.message });
        }
    }, [error]);

    const configMap = useMemo(() => {
        return getUploaderTypeList().reduce(
            (acc, type) => {
                acc[type] = getConfigList(type);
                return acc;
            },
            {} as Record<string, IUploaderConfigItem[]>,
        );
    }, [updated]);

    const isActiveUploader = useMemo(() => (type: string) => type === getActiveUploaderType(), [updated]);
    const isActiveConfig = useMemo(
        () => (type: string, configId: string) => configId === getActiveConfig(type)?._id,
        [updated],
    );
    const itemAccessories = useMemo(
        () => (type: string, config: IUploaderConfigItem) => {
            const accessories = [];
            if (isActiveConfig(type, config._id)) {
                accessories.push({ icon: { source: Icon.Check } });

                if (isActiveUploader(type)) {
                    accessories.push({ text: { value: "Default" } });
                }
            }
            return accessories;
        },
        [updated],
    );
    const configItemText = (item: IPluginConfig, cfg: IUploaderConfigItem) => {
        const val = String(cfg[item.name]!);
        return item.type === "password" ? "*".repeat(val.length) : val;
    };

    if (Object.keys(configMap).flatMap((type) => configMap[type]).length === 0) {
        return (
            <List>
                <List.EmptyView
                    title="No Uploader Configs Found"
                    actions={
                        <ActionPanel>
                            <Action.Push
                                title={`Add New Config`}
                                icon={Icon.Plus}
                                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                                onPop={() => {
                                    setUpdated(!updated);
                                }}
                                target={
                                    <ConfigEditForm
                                        type={getUploaderTypeList()[0]}
                                        getUploaderTypeList={getUploaderTypeList}
                                        getConfigItems={getUploaderConfigItemDetails}
                                        createOrUpdateConfig={createOrUpdateConfig}
                                        renameConfig={renameConfig}
                                    />
                                }
                            />
                        </ActionPanel>
                    }
                />
            </List>
        );
    }

    return (
        <List isShowingDetail>
            {Object.keys(configMap).map((type) => (
                <List.Section key={type} title={type}>
                    {configMap[type].map((cfg) => (
                        <List.Item
                            title={cfg._configName}
                            key={cfg._id}
                            icon={Icon.Cog}
                            accessories={itemAccessories(type, cfg)}
                            keywords={[type]}
                            detail={
                                <List.Item.Detail
                                    metadata={
                                        <List.Item.Detail.Metadata>
                                            <List.Item.Detail.Metadata.Label
                                                key="metadata"
                                                title={cfg._configName}
                                            ></List.Item.Detail.Metadata.Label>
                                            <List.Item.Detail.Metadata.Separator />
                                            {getUploaderConfigItemDetails(type)?.map((item) => {
                                                return (
                                                    <List.Item.Detail.Metadata.Label
                                                        key={`${type}.${cfg._configName}.${item.name}`}
                                                        title={`${item.name} ${item.required ? "*" : ""}`}
                                                        text={configItemText(item, cfg)}
                                                    />
                                                );
                                            })}
                                        </List.Item.Detail.Metadata>
                                    }
                                />
                            }
                            actions={
                                <ActionPanel>
                                    <Action
                                        title="Set as Default Config"
                                        icon={Icon.Check}
                                        onAction={() => {
                                            setActiveConfig({ uploaderType: type, configId: cfg._id });
                                            setUpdated(!updated);
                                        }}
                                    />
                                    <Action.Push
                                        title="Edit Config"
                                        icon={Icon.Pencil}
                                        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                                        onPop={() => {
                                            setUpdated(!updated);
                                        }}
                                        target={
                                            <ConfigEditForm
                                                type={type}
                                                getConfigItems={getUploaderConfigItemDetails}
                                                getUploaderTypeList={getUploaderTypeList}
                                                createOrUpdateConfig={createOrUpdateConfig}
                                                renameConfig={renameConfig}
                                                config={{ ...cfg }}
                                            />
                                        }
                                    ></Action.Push>
                                    <Action.Push
                                        title={`Add New Config`}
                                        icon={Icon.PlusCircle}
                                        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                                        onPop={() => {
                                            setUpdated(!updated);
                                        }}
                                        target={
                                            <ConfigEditForm
                                                type={type}
                                                getUploaderTypeList={getUploaderTypeList}
                                                getConfigItems={getUploaderConfigItemDetails}
                                                createOrUpdateConfig={createOrUpdateConfig}
                                                renameConfig={renameConfig}
                                            />
                                        }
                                    />

                                    <Action
                                        title="Duplicate Config"
                                        icon={Icon.Duplicate}
                                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                                        onAction={() => {
                                            try {
                                                copyConfig(type, cfg._configName, `${cfg._configName} Copy`);
                                                setUpdated(!updated);
                                            } catch (e) {
                                                setError(e as Error);
                                            }
                                        }}
                                    />
                                    <Action.Open
                                        title="Open Config File"
                                        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                                        icon={Icon.Code}
                                        target={ctx.configPath}
                                    ></Action.Open>
                                    <Action
                                        title="Delete Config"
                                        icon={Icon.Trash}
                                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                                        style={Action.Style.Destructive}
                                        onAction={async () => {
                                            await confirmAlert({
                                                title: `Are you sure you want to delete config '${cfg._configName}'?`,
                                                message: "This action cannot be undone.",
                                                primaryAction: {
                                                    title: "Delete",
                                                    style: Alert.ActionStyle.Destructive,
                                                    onAction: () => {
                                                        try {
                                                            removeConfig(type, cfg._configName);
                                                            setUpdated(!updated);
                                                        } catch (e) {
                                                            setError(e as Error);
                                                        }
                                                    },
                                                },
                                            });
                                        }}
                                    />
                                </ActionPanel>
                            }
                        ></List.Item>
                    ))}
                </List.Section>
            ))}
        </List>
    );
}
