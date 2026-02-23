import { IConfig, IUploaderConfigItem as Item, IPluginConfig, IUploaderTypeConfigs } from "picgo";

declare module "picgo" {
    export interface IConfig {
        uploader?: Record<string, IUploaderTypeConfigs>;
    }
    export type IUploaderConfigItem = Item & {
        [key: string]: string | boolean;
    };

    export interface IPluginConfig {
        type: "input" | "password" | "list" | "checkbox" | "confirm";
        choices?: {
            name?: string;
            value?: any;
        }[];
        tips?: string;
    }
}
