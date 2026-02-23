import { PicGo, IUploaderConfigItem } from "picgo";
import { UserUploaderConfig } from "../types/type";
import { useRef } from "react";
import { env } from "process";
import path from "path";
import { getPreferenceValues } from "@raycast/api";
import { withTimeout } from "./util";

export default function () {
    const { npmPath, uploadTimeout, npmMirror, npmProxy, proxy } = getPreferenceValues<Preferences>();
    const processEnv = {
        ...env,
        PATH: [npmPath, env.PATH].join(path.delimiter),
    };

    const ctxRef = useRef<PicGo | null>(null);
    if (!ctxRef.current) ctxRef.current = new PicGo();
    const ctx = ctxRef.current;

    ctx.saveConfig({ "picBed.proxy": proxy });

    const getActiveUploaderType = () => ctx.getConfig<string>("picBed.uploader");
    const getUploaderTypeList = () => ctx.uploaderConfig.listUploaderTypes();

    function getConfigList(type?: string) {
        if (!type) type = getActiveUploaderType();
        if (!getUploaderTypeList().find((t) => t === type)) throw new Error(`Uploader type '${type}' not found`);
        return ctx.uploaderConfig.getConfigList(type);
    }

    function getActiveConfig(type?: string) {
        if (!type) type = getActiveUploaderType();
        if (!getUploaderTypeList().find((t) => t === type)) throw new Error(`Uploader type '${type}' not found`);
        return ctx.uploaderConfig.getActiveConfig(type);
    }

    function isAvailableConfig(config: UserUploaderConfig) {
        const { uploaderType: type, configId } = config;
        if (!configId) return false;
        if (!getUploaderTypeList().find((t) => t === type)) return false;
        if (!getConfigList(type).find((cfg) => cfg._id === configId)) return false;
        return true;
    }

    function setActiveConfig(config: UserUploaderConfig) {
        const { uploaderType: type, configId } = config;
        if (!configId) throw new Error("ConfigName undefined");
        if (!getUploaderTypeList().find((t) => t === type)) throw new Error(`Uploader type '${type}' not found`);
        const cfg = getConfigList(type).find((c) => c._id === configId)!;
        if (!cfg) throw new Error(`Config Id '${configId}' not found for uploader type '${type}'`);
        // ctx.setConfig({
        //     "picBed.uploader": type,
        //     "picBed.current": type,
        //     [`picBed.${type}`]: cfg,
        //     [`uploader.${type}.defaultId`]: cfg._id,
        // });
        ctx.uploaderConfig.use(type, cfg._configName);
    }

    async function upload(input?: string[]) {
        const timeout = Number(uploadTimeout);
        return await withTimeout(ctx.upload(input), timeout, `Upload timeout: ${timeout / 1000}s`);
    }

    return {
        ctx: ctx,
        getUploaderTypeList,

        getActiveUploaderType,
        getConfigList,
        getActiveConfig,

        isAvailableConfig,
        setActiveConfig,

        upload,

        getUploaderConfigItemDetails: (type: string) => ctx.helper.uploader.get(type)?.config?.(ctx) ?? [],
        createOrUpdateConfig: (type: string, config: IUploaderConfigItem) =>
            ctx.uploaderConfig.createOrUpdate(type, config._configName, config),
        copyConfig: (type: string, oldName: string, newName: string) => ctx.uploaderConfig.copy(type, oldName, newName),
        removeConfig: (type: string, configName: string) => ctx.uploaderConfig.remove(type, configName),
        renameConfig: (type: string, oldName: string, newName: string) =>
            ctx.uploaderConfig.rename(type, oldName, newName),

        getInstalledPluginNameList: () => ctx.pluginLoader.getFullList(),
        getEnabledPluginNameList: () => ctx.pluginLoader.getList(),
        getPlugin: (name: string) => ctx.pluginLoader.getPlugin(name),
        hasPlugin: (name: string) => ctx.pluginLoader.hasPlugin(name),

        installPlugin: (names: string[]) =>
            ctx.pluginHandler.install(names, { npmProxy, npmRegistry: npmMirror }, processEnv),
        updatePlugin: (names: string[]) =>
            ctx.pluginHandler.update(names, { npmProxy, npmRegistry: npmMirror }, processEnv),
        uninstallPlugin: (names: string[]) => ctx.pluginHandler.uninstall(names, processEnv),
    };
}
