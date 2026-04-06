import { ActionPanel, Action, Grid, Icon, getPreferenceValues, Clipboard, showToast, Toast } from "@raycast/api";
import { IImgInfo } from "picgo";
import { exportFormats } from "../util/format";
import { useEffect, useMemo, useState } from "react";
import FormatListPage from "./FormatListPage";

interface Props {
    imgs: IImgInfo[];
}

export default function ImagesPreviewPage({ imgs }: Props) {
    const [formatKey, setFormatKey] = useState<keyof typeof exportFormats>("url");
    const format = useMemo(() => exportFormats[formatKey]!, [formatKey]);
    const { autoCopyAfterUpload } = getPreferenceValues<Preferences.UploadImages>();
    const validImgs = imgs.filter((i) => i.imgUrl);

    useEffect(() => {
        if (autoCopyAfterUpload) {
            Clipboard.copy(exportFormats.url.generate(validImgs));
            showToast({ style: Toast.Style.Success, title: "URL Copied!" });
        }
    }, []);

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
                <Grid.Dropdown storeValue={true} onChange={(v) => setFormatKey(v)} tooltip="Image Formats">
                    {Object.keys(exportFormats).map((k) => {
                        const f = exportFormats[k];
                        return <Grid.Dropdown.Item key={f.name} title={f.label} value={f.name} />;
                    })}
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
                                title={`Copy as ${format.label} Format`}
                                content={format.generate([img])}
                            />
                            <Action.CopyToClipboard
                                title={`Copy All as ${format.label} Format`}
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
