import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  Image,
  Keyboard,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ImageType, SGDBGame, SGDBImage, imageTypes } from "./types.js";
import { db, downloadImage, imageTypeSpecs, preferences } from "./utils.js";

const findImageType = (value: string) =>
  imageTypes.find((imageType) => imageType.value === value);

export const ImageDetail = ({
  image,
  imageType,
}: {
  image: SGDBImage;
  imageType: ImageType;
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const imageTypeSpec = imageTypeSpecs[imageType.value];

  return (
    <Detail
      markdown={`![](${image.url})`}
      actions={
        <ActionPanel>
          <Action
            title="Download Image"
            icon={Icon.Download}
            onAction={async () => {
              if (isDownloading) return;
              setIsDownloading(true);
              const toast = await showToast({
                title: "Downloading Image",
                style: Toast.Style.Animated,
              });

              try {
                const file = await downloadImage(
                  image.url.toString(),
                  preferences.downloadPath || "",
                );
                toast.title = "Downloaded Image";
                toast.style = Toast.Style.Success;
                if (preferences.showInFinderAfterDownload)
                  await showInFinder(file);
              } catch {
                toast.title = "Couldn't Download Image";
                toast.style = Toast.Style.Failure;
              } finally {
                setIsDownloading(false);
              }
            }}
          />
          <Action.CopyToClipboard
            icon={Icon.Link}
            title="Copy URL to Clipboard"
            content={image.url.toString()}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            url={`https://www.steamgriddb.com/${imageTypeSpec.websitePathname}/${image.id}`}
          />
        </ActionPanel>
      }
    />
  );
};

export const ImagePreview = ({ game }: { game: SGDBGame }) => {
  const [images, setImages] = useState<SGDBImage[]>([]);
  const [imageType, setImageType] = useState<ImageType>(imageTypes[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!game.id) return;

    let isCurrentRequest = true;

    const fetchImages = async () => {
      setIsLoading(true);
      const images = await db[`get${imageType.value}ById`](game.id).catch(
        () => [],
      );

      if (!isCurrentRequest) return;

      setImages(images as SGDBImage[]);
      setIsLoading(false);
    };

    void fetchImages();

    return () => {
      isCurrentRequest = false;
    };
  }, [game.id, imageType]);

  const imageTypeSpec = imageTypeSpecs[imageType.value];

  return (
    <Grid
      columns={imageTypeSpec.gridColumns}
      isLoading={isLoading}
      aspectRatio={imageTypeSpec.aspectRatio}
      fit={imageTypeSpec.imageFit}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Grid Type"
          value={imageType.value}
          onChange={(value) =>
            setImageType(findImageType(value) ?? imageTypes[0])
          }
        >
          {imageTypes.map((type) => (
            <Grid.Dropdown.Item
              key={type.value}
              value={type.value}
              title={type.title}
              icon={type.icon}
            />
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
              <Action.Push
                title="View Image"
                icon={Icon.Image}
                target={<ImageDetail image={image} imageType={imageType} />}
              />
              <Action
                title="Download Image"
                icon={Icon.Download}
                onAction={async () => {
                  if (isDownloading) return;
                  setIsDownloading(true);
                  const toast = await showToast({
                    title: "Downloading Image…",
                    style: Toast.Style.Animated,
                  });

                  try {
                    const file = await downloadImage(
                      image.url.toString(),
                      preferences.downloadPath || "",
                    );
                    toast.title = "Downloaded Image";
                    toast.style = Toast.Style.Success;
                    toast.primaryAction = {
                      title:
                        process.platform === "darwin"
                          ? "Show In Finder"
                          : "Show In File Explorer",
                      onAction: async (toast) => {
                        await showInFinder(file);
                        toast.hide();
                      },
                    };
                    if (preferences.showInFinderAfterDownload)
                      await showInFinder(file);
                  } catch {
                    toast.title = "Couldn't Download Image";
                    toast.style = Toast.Style.Failure;
                  } finally {
                    setIsDownloading(false);
                  }
                }}
              />
              <Action.CopyToClipboard
                icon={Icon.Link}
                title="Copy URL to Clipboard"
                content={image.url.toString()}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.OpenInBrowser
                shortcut={{ modifiers: ["shift"], key: "enter" }}
                url={`https://www.steamgriddb.com/${imageTypeSpec.websitePathname}/${image.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};
