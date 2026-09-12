import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { IImgInfo } from "picgo";
import { exportFormats, type ExportFormatKey } from "../util/format";
import { useState } from "react";
import FormatListPage from "./FormatListPage";

interface Props {
    imgs: IImgInfo[];
}

export default function ImagesPreviewPage({ imgs }: Props) {
    const [formatKey, setFormatKey] = useState<ExportFormatKey>("url");
    const format = exportFormats[formatKey];
    const validImgs = imgs.filter((i) => i.imgUrl);

    if (validImgs.length === 0) {
        return (
            <Grid>
                <Grid.EmptyView title="No Content"></Grid.EmptyView>
            </Grid>
        );
    }

    return (
        <Grid
            columns={5}
            inset={Grid.Inset.Small}
            navigationTitle="Image Preview"
            searchBarAccessory={
                <Grid.Dropdown
                    onChange={(value) => {
                        setFormatKey((value || "url") as ExportFormatKey);
                    }}
                    tooltip="Image Formats"
                >
                    {Object.values(exportFormats).map((format) => (
                        <Grid.Dropdown.Item key={format.name} title={format.label} value={format.name} />
                    ))}
                </Grid.Dropdown>
            }
        >
            {validImgs.map((img) => (
                <Grid.Item
                    key={img.imgUrl}
                    content={img.imgUrl!}
                    title={img.fileName}
                    subtitle={img.imgUrl}
                    accessory={{ icon: Icon.Link, tooltip: img.imgUrl }}
                    actions={
                        <ActionPanel>
                            <Action.CopyToClipboard
                                title={`Copy ${format.label} to Clipboard`}
                                content={format.generate([img])}
                            />
                            <Action.CopyToClipboard
                                title={`Copy All ${format.label} to Clipboard`}
                                content={format.generate(validImgs)}
                            />
                            <Action.Push
                                title="Switch to Format List View"
                                icon={Icon.Switch}
                                target={<FormatListPage result={validImgs} />}
                            />
                        </ActionPanel>
                    }
                ></Grid.Item>
            ))}
        </Grid>
    );
}
