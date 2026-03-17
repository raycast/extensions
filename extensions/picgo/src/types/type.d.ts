import { IImgInfo } from "picgo";
import usePicGoContext from "../util/context";

export type ImgUrlExportFormat = {
    name: string;
    label: string;
    generate: (urls: IImgInfo[]) => string;
};

export type UploadFormData = {
    uploaderConfig: string;
    files: string[];
};

export type UserUploaderConfig = {
    uploaderType: string;
    configName?: string;
    configId?: string;
};
