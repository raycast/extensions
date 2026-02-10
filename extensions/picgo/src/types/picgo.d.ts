import { IConfig, IUploaderConfigItem } from "picgo";

declare module "picgo" {
    export interface IConfig {
        uploader?: {
            [name: string]: {
                configList: IUploaderConfigItem[];
                defaultId: string;
            };
        };
    }
}
