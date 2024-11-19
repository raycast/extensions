import { getPreferenceValues } from "@raycast/api";

interface Preferences {
    language: string;
}

const translations = {
    "zh": {
        title: "二维码生成器",
        searchPlaceholder: "搜索链接...",
        addLink: "新增链接",
        selectLanguage: "选择语言 / Select Language",
        select: "选择",
        urlLabel: "URL",
        urlPlaceholder: "输入链接地址",
        urlError: "请输入 URL",
        description: "描述",
        descriptionPlaceholder: "输入链接描述",
        copyFullUrl: "复制完整链接",
        copyDomain: "复制域名",
        copyPath: "复制路径",
        copyQuery: "复制查询参数",
        copyHash: "复制锚点",
        copyQRCode: "复制二维码图片",
        deleteLink: "删除链接",
        generateQRCode: "选择链接生成二维码",
        generateFailed: "生成二维码失败，请重试",
        protocol: "协议",
        domain: "域名",
        path: "路径",
        queryParams: "查询参数",
        hash: "锚点",
        error: "错误",
        invalidUrl: "无效的 URL",
        desc: "描述",
        showMetadata: "显示元数据",
        hideMetadata: "隐藏元数据",
    },
    "en": {
        title: "QR Code Generator",
        searchPlaceholder: "Search links...",
        addLink: "Add Link",
        selectLanguage: "Select Language / 选择语言",
        select: "Select",
        urlLabel: "URL",
        urlPlaceholder: "Enter URL",
        urlError: "Please enter URL",
        description: "Description",
        descriptionPlaceholder: "Enter description",
        copyFullUrl: "Copy Full URL",
        copyDomain: "Copy Domain",
        copyPath: "Copy Path",
        copyQuery: "Copy Query Parameters",
        copyHash: "Copy Hash",
        copyQRCode: "Copy QR Code Image",
        deleteLink: "Delete Link",
        generateQRCode: "Select a link to generate QR code",
        generateFailed: "Failed to generate QR code, please try again",
        protocol: "Protocol",
        domain: "Domain",
        path: "Path",
        queryParams: "Query Parameters",
        hash: "Hash",
        error: "Error",
        invalidUrl: "Invalid URL",
        desc: "Description",
        showMetadata: "Show Metadata",
        hideMetadata: "Hide Metadata",
    }
};

export function useTranslation() {
    const { language } = getPreferenceValues<Preferences>();
    return translations[language as keyof typeof translations] || translations.en;
}


