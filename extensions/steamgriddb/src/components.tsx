import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  Image,
  showInFinder,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ImageType, SGDBGame, SGDBImage } from "./types.js";
import { db, downloadImage, imageTypes, imageTypeSpecs } from "./utils.js";

export const ImageDetail = ({ image }: { image: SGDBImage }) => {
  return <Detail markdown={`![](${image.url})`} />;
};

export const ImagePreview = ({ game }: { game: SGDBGame }) => {
  const [images, setImages] = useState<SGDBImage[]>([]);
  const [imageType, setImageType] = useState<ImageType>(ImageType.Grids);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGrids = async (gameId: number, imageType: ImageType) => {
    setIsLoading(true);
    const images = await db[`get${imageType}ById`](gameId).catch(() => []);
    setImages(images as SGDBImage[]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!game.id) return;
    fetchGrids(game.id, imageType);
  }, [game.id, imageType]);

  if (isLoading) return <Grid isLoading />;

  return (
    <Grid
      columns={imageTypeSpecs[imageType].gridColumns}
      isLoading={isLoading}
      aspectRatio={imageTypeSpecs[imageType].aspectRatio}
      fit={imageTypeSpecs[imageType].imageFit}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Grid Type"
          onChange={(value) => setImageType(value as ImageType)}
        >
          {imageTypes.map((t) => (
            <Grid.Dropdown.Item key={t} value={t} title={t} />
          ))}
        </Grid.Dropdown>
      }
    >
      {images.map((image) => (
        <Grid.Item
          key={image.id}
          keywords={[
            image.author.name,
            image.width.toString(),
            image.height.toString(),
          ]}
          title={image.author.name}
          subtitle={`${image.width}x${image.height}`}
          accessory={{
            icon: {
              source: image.author.avatar.toString(),
              mask: Image.Mask.Circle,
            },
          }}
          content={image.thumb.toString()}
          actions={
            <ActionPanel>
              <Action
                title={
                  // eslint-disable-next-line @raycast/prefer-title-case
                  isDownloading ? "Downloading..." : "Download Image"
                }
                icon={Icon.Image}
                onAction={async () => {
                  if (isDownloading) return;
                  setIsDownloading(true);
                  const file = await downloadImage(image.url.toString());
                  setIsDownloading(false);
                  await showInFinder(file);
                }}
              />
              <Action.CopyToClipboard
                icon={Icon.Link}
                title="Copy URL to Clipboard"
                content={image.url.toString()}
              />
              <Action.OpenInBrowser
                shortcut={{ modifiers: ["shift"], key: "enter" }}
                url={`https://www.steamgriddb.com/${imageTypeSpecs[imageType].websitePathname}/${image.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};
