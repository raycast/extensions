import { type IImgInfo } from "picgo";

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { exportFormats } from "../util/format";
import ImagesMetadataPanel from "./ImagesMetadataPanel";

interface Props {
    result: IImgInfo[];
}

export default function UploadResultPage({ result }: Props) {
    result = result.filter((r) => r.imgUrl);
    const urls = result.map((r) => r.imgUrl!);
    if (result.length === 0)
        return (
            <List>
                <List.EmptyView icon={Icon.Warning} title="No Image URL Results." />
            </List>
        );
    return (
        <List isShowingDetail navigationTitle={`${result.length} images uploaded`}>
            {exportFormats.map((f) => {
                return (
                    <List.Item
                        id={f.name}
                        title={f.label}
                        key={f.name}
                        actions={
                            <ActionPanel>
                                <Action.CopyToClipboard
                                    title={`Copy ${f.label} to Clipboard`}
                                    content={f.generate(urls)}
                                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                                ></Action.CopyToClipboard>
                            </ActionPanel>
                        }
                        detail={
                            <List.Item.Detail
                                markdown={`### ${f.label} Preview \n \`\`\`\n${f.generate(urls)}\n\`\`\``}
                                metadata={<ImagesMetadataPanel result={result}></ImagesMetadataPanel>}
                            ></List.Item.Detail>
                        }
                    ></List.Item>
                );
            })}
        </List>
    );
}
