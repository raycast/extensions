import { ImgUrlExportFormat } from "../types/type";

export const exportFormats: ImgUrlExportFormat[] = [
    {
        name: "url",
        label: "URL",
        generate: (urls) => urls.join("\n"),
    },
    {
        name: "markdown",
        label: "Markdown",
        generate: (urls) => urls.map((url) => `![${url.split("/").pop() || "image"}](${url})`).join("\n"),
    },
    {
        name: "html",
        label: "HTML",
        generate: (urls: string[]) => urls.map((url) => `<img src="${url}" alt="image" />`).join("\n"),
    },
    {
        name: "ubb",
        label: "UBB",
        generate: (urls: string[]) => urls.map((url) => `[img]${url}[/img]`).join("\n"),
    },
];
