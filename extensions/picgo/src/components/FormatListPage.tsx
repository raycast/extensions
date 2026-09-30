import { type IImgInfo } from "picgo";

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { exportFormats } from "../util/format";
import ImagesMetadataPanel from "./ImagesMetadataPanel";
import ImagesPreviewPage from "./ImagesPreviewPage";

interface Props {
    result: IImgInfo[];
}

export default function FormatListPage({ result }: Props) {
    const imgs = result.filter((r) => r.imgUrl);

    if (imgs.length === 0)
        return (
            <List>
                <List.EmptyView icon={Icon.Warning} title="No Image URL Results." />
            </List>
        );

    return (
        <List isShowingDetail navigationTitle={`${imgs.length} images uploaded`}>
            {Object.values(exportFormats).map((f) => {
                return (
                    <List.Item
                        id={f.name}
                        title={f.label}
                        key={f.name}
                        actions={
                            <ActionPanel>
                                <Action.CopyToClipboard
                                    title={`Copy All ${f.label} to Clipboard`}
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
