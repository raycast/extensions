import { ActionPanel, Grid, Icon } from "@raycast/api";
import { bufferToDataUrl } from "../utils/helpers";
import type { ManifestData } from "image-shield";
import { MANIFEST_FILE_NAME } from "../constraints";
import { DownloadAllImagesAction } from "./DownloadAction";

interface GridEncryptedImagesProps {
  manifest: ManifestData;
  imageBuffers: Buffer[];
  workdir?: string;
}

function GridEncryptedImages({ manifest, imageBuffers, workdir }: GridEncryptedImagesProps) {
  return (
    <Grid filtering={false} searchText="Encrypted Images" onSearchTextChange={() => {}} inset={Grid.Inset.Small}>
      <Grid.Item
        content={Icon.Document}
        title={MANIFEST_FILE_NAME}
        actions={
          <ActionPanel>
            <DownloadAllImagesAction
              manifest={manifest}
              imageBuffers={imageBuffers}
              workdir={workdir}
              isFragmented={true}
            />
          </ActionPanel>
        }
      />
      {imageBuffers.map((imageBuffer, i) => {
        return (
          <Grid.Item
            key={i}
            content={bufferToDataUrl(imageBuffer)}
            title={`#${i + 1}`}
            actions={
              <ActionPanel>
                <DownloadAllImagesAction
                  manifest={manifest}
                  imageBuffers={imageBuffers}
                  workdir={workdir}
                  isFragmented={true}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

export default GridEncryptedImages;
