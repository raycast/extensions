import {
    Action,
    ActionPanel,
    Form,
    List,
    Clipboard,
    Icon,
    showToast,
    Toast,
    useNavigation,
    openExtensionPreferences,
} from "@raycast/api";

import ConfigDropdownList from "./components/ConfigDropdown";
import type { UserUploaderConfig, UploadFormData } from "./types/type";
import { isImgFile } from "./util/util";
import UploadResultPage from "./components/UploadResultPage";
import ErrorView from "./components/ErrorView";
import getPicGoContext from "./util/context";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import UploaderManagement from "./uploader-management";

const UPLOADER_CONFIG_KEY = "picgo:user_uploader_config";

export default function Command() {
    const {
        upload,
        getActiveUploaderType,
        getActiveConfig,
        isAvailableConfig,
        setActiveConfig,
        getUploaderTypeList,
        getConfigList,
    } = getPicGoContext();

    const { push } = useNavigation();

    const {
        value: localConfig,
        isLoading,
        setValue: setLocalConfig,
        removeValue: removeLocalConfig,
    } = useLocalStorage<UserUploaderConfig>(UPLOADER_CONFIG_KEY);
    const initialConfig: UserUploaderConfig = {
        uploaderType: getActiveUploaderType(),
        configName: getActiveConfig()?._configName,
        configId: getActiveConfig()?._id,
    };

    const [config, setConfig] = useState<UserUploaderConfig | undefined>();
    const [error, setError] = useState<Error | undefined>();
    const [isUploading, setUploading] = useState<boolean>(false);

    useEffect(() => {
        if (isLoading) return;
        if (localConfig && isAvailableConfig(localConfig)) setConfig(localConfig);
        else {
            console.warn(
                `LocalStorage config '${JSON.stringify(localConfig)}' not available, config state fallback to default config '${JSON.stringify(initialConfig)}'`,
            );
            setConfig(initialConfig);
        }
    }, [isLoading]);

    useEffect(() => {
        try {
            if (!isAvailableConfig(initialConfig)) {
                removeLocalConfig();
                throw new Error("No available config");
            }
        } catch (e) {
            const err = e as Error;
            console.warn(error?.message);
            setError(err);
            showToast(Toast.Style.Failure, err.message);
        }
    }, []);

    const dropdownItems = useMemo(() => {
        return <ConfigDropdownList uploaderTypes={getUploaderTypeList()} getConfigList={getConfigList} />;
    }, []);

    async function uploadImgs(input?: string[]) {
        setUploading(true);
        const toast = await showToast(Toast.Style.Animated, "Uploading...");
        try {
            const res = await upload(input);

            if (res instanceof Error) throw res;
            if (res.length === 0) throw new Error("No results returned");
            const urls = res.filter((r) => r.imgUrl).map((r) => r.imgUrl);
            if (urls.length === 0) throw new Error("No url results returned");

            toast.style = Toast.Style.Success;
            toast.title = "Success";

            push(<UploadResultPage result={res} />);
        } catch (err) {
            const e = err as Error;
            console.error("Upload failed:", e);

            toast.style = Toast.Style.Failure;
            toast.title = "Upload Failed";
            toast.message = e.message;
            toast.primaryAction = {
                title: "Copy Error Log",
                shortcut: { modifiers: ["cmd", "shift"], key: "f" },
                onAction: (toast) => {
                    Clipboard.copy(`${e.stack ?? e.message}`);
                    toast.hide();
                },
            };
        } finally {
            setUploading(false);
        }
    }

    async function handleFilesUpload(data: UploadFormData) {
        const { uploaderConfig, files } = data;
        const config = JSON.parse(uploaderConfig) as UserUploaderConfig;
        // config is available
        await setLocalConfig(config);
        setActiveConfig(config);
        const imgs = files.filter((f) => isImgFile(f));
        if (imgs.length === 0) {
            showToast(Toast.Style.Failure, "Error", "Please pick image files.");
            return false;
        }
        await uploadImgs(files);
    }

    async function handleClipboardUpload() {
        await uploadImgs();
    }

    if (error) {
        return (
            <ErrorView
                error={error}
                description="Make sure you setup uploader configs"
                actions={
                    <ActionPanel>
                        <Action.Push
                            title="Setup Uploader Configs"
                            icon={Icon.Cog}
                            target={<UploaderManagement />}
                        ></Action.Push>
                        <Action.OpenInBrowser url="https://docs.picgo.app/core/" title="View Installation Guide" />
                    </ActionPanel>
                }
            />
        );
    }

    if (isLoading || !config) {
        return <List isLoading />;
    }

    if (isUploading) return <Form isLoading />;

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Upload Image" icon={Icon.Upload} onSubmit={handleFilesUpload} />
                    <Action
                        title="Quick Upload from Clipboard"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd"], key: "v" }}
                        onAction={handleClipboardUpload}
                    />
                    <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Cog} />
                </ActionPanel>
            }
        >
            <Form.Dropdown
                id="uploaderConfig"
                title="Uploader Config"
                value={JSON.stringify(config)}
                onChange={(data) => {
                    const cfg = JSON.parse(data) as UserUploaderConfig;
                    setConfig(cfg);
                }}
            >
                {dropdownItems}
            </Form.Dropdown>
            <Form.Separator />
            <Form.FilePicker
                autoFocus
                id="files"
                title="Select from Files"
                canChooseDirectories={false}
                canChooseFiles
                allowMultipleSelection
            />
            <Form.Description
                title="Quick Tips"
                text={`• ⌘ + V: Quick Upload from Clipboard\n• ⌘ + Enter: Submit and upload`}
            />
        </Form>
    );
}
