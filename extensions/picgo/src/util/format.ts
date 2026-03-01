import { IImgInfo } from "picgo";
import { ImgUrlExportFormat } from "../types/type";
import { getPreferenceValues } from "@raycast/api";

const { customFormat } = getPreferenceValues<Preferences>();

const fileName = (img: IImgInfo) =>
    img.fileName?.replace(new RegExp(`\\${img.extname}`), "") ?? img.imgUrl?.split("/").pop()?.split(".")[0] ?? "image";
const extName = (img: IImgInfo) => img.extname ?? "." + img.imgUrl?.split(".").pop();

export const exportFormats: Record<string, ImgUrlExportFormat> = {
    url: {
        name: "url",
        label: "URL",
        generate: (imgs) => imgs.map((i) => i.imgUrl).join("\n"),
    },
    markdown: {
        name: "markdown",
        label: "Markdown",
        generate: (imgs) => imgs.map((img) => `![](${img.imgUrl})`).join("\n"),
    },
    html: {
        name: "html",
        label: "HTML",
        generate: (imgs) => imgs.map((img) => `<img src="${img.imgUrl}" />`).join("\n"),
    },
    ubb: {
        name: "ubb",
        label: "UBB",
        generate: (imgs) => imgs.map((img) => `[img]${img.imgUrl}[/img]`).join("\n"),
    },
    custom: {
        name: "custom",
        label: "Custom Format",
        generate: (imgs) =>
            imgs
                .map((img) => {
                    const items: Record<string, string> = {
                        $fileName: fileName(img) ?? "",
                        $url: img.imgUrl ?? "",
                        $extName: extName(img) ?? "",
                    };
                    let format = customFormat;
                    Object.entries(items).forEach(([key, value]) => {
                        if (!format.includes(key)) return;
                        format = format.replaceAll(key, value);
                    });
                    return format;
                })
                .join("\n"),
    },
};
