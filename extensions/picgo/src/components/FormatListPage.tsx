import { type IImgInfo } from "picgo";

import { Action, ActionPanel, Icon, List, getPreferenceValues, Clipboard, showToast, Toast } from "@raycast/api";
import { exportFormats } from "../util/format";
import ImagesMetadataPanel from "./ImagesMetadataPanel";
import ImagesPreviewPage from "./ImagesPreviewPage";
import { useEffect } from "react";

interface Props {
    result: IImgInfo[];
}

export default function FormatListPage({ result }: Props) {
    const { autoCopyAfterUpload } = getPreferenceValues<Preferences.UploadImages>();
    const imgs = result.filter((r) => r.imgUrl);

    useEffect(() => {
        if (autoCopyAfterUpload) {
            Clipboard.copy(exportFormats.url.generate(imgs));
            showToast({ style: Toast.Style.Success, title: "URL Copied!" });
        }
    }, []);

    if (imgs.length === 0)
        return (
            <List>
                <List.EmptyView icon={Icon.Warning} title="No Image URL Results." />
            </List>
        );

    return (
        <List isShowingDetail navigationTitle={`${imgs.length} images uploaded`}>
            {Object.keys(exportFormats).map((k) => {
                const f = exportFormats[k];
                return (
                    <List.Item
                        id={f.name}
                        title={f.label}
                        key={f.name}
                        actions={
                            <ActionPanel>
                                <Action.CopyToClipboard
                                    title={`Copy ${f.label} to Clipboard`}
                                    content={f.generate(imgs)}
                                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                                ></Action.CopyToClipboard>
                                <Action.Push
                                    title="Switch to Image Grid View"
                                    icon={Icon.Switch}
                                    target={<ImagesPreviewPage imgs={imgs} />}
                                ></Action.Push>
                            </ActionPanel>
                        }
                        detail={
                            <List.Item.Detail
                                markdown={`### ${f.label} Preview \n \`\`\`\n${f.generate(imgs)}\n\`\`\``}
                                metadata={<ImagesMetadataPanel result={imgs}></ImagesMetadataPanel>}
                            ></List.Item.Detail>
                        }
                    ></List.Item>
                );
            })}
        </List>
    );
}
