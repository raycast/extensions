import { useState } from "react";
import { Grid, ActionPanel, Action, Detail, Toast, showToast, Icon, List } from "@raycast/api";
import { withGoogleAuth } from "./components/withGoogleAuth";
import { usePhotos } from "./hooks/usePhotos";
import { usePhoto } from "./hooks/usePhoto";
import { downloadMedia } from "./utils";

const sorts = [
  { id: "all", name: "All", value: "ALL_MEDIA", icon: Icon.House },
  { id: "photos", name: "Photos", value: "PHOTO", icon: Icon.Image },
  { id: "videos", name: "Videos", value: "VIDEO", icon: Icon.Video },
];

const categories = [
  { id: "animals", name: "Animals", value: "ANIMALS" },
  { id: "fashion", name: "Fashion", value: "FASHION" },
  { id: "landmarks", name: "Landmarks", value: "LANDMARKS" },
  { id: "receipts", name: "Receipts", value: "RECEIPTS" },
  { id: "weddings", name: "Weddings", value: "WEDDINGS" },
  { id: "arts", name: "Arts", value: "ARTS" },
  { id: "flowers", name: "Flowers", value: "FLOWERS" },
  { id: "landscapes", name: "Landscapes", value: "LANDSCAPES" },
  { id: "screenshots", name: "Screenshots", value: "SCREENSHOTS" },
  { id: "whiteboards", name: "Whiteboards", value: "WHITEBOARDS" },
  { id: "birthdays", name: "Birthdays", value: "BIRTHDAYS" },
  { id: "food", name: "Food", value: "FOOD" },
  { id: "night", name: "Night", value: "NIGHT" },
  { id: "selfies", name: "Selfies", value: "SELFIES" },
  { id: "cityscapes", name: "Cityscapes", value: "CITYSCAPES" },
  { id: "gardens", name: "Gardens", value: "GARDENS" },
  { id: "people", name: "People", value: "PEOPLE" },
  { id: "sport", name: "Sport", value: "SPORT" },
  { id: "crafts", name: "Crafts", value: "CRAFTS" },
  { id: "holidays", name: "Holidays", value: "HOLIDAYS" },
  { id: "performances", name: "Performances", value: "PERFORMANCES" },
  { id: "travel", name: "Travel", value: "TRAVEL" },
  { id: "documents", name: "Documents", value: "DOCUMENTS" },
  { id: "houses", name: "Houses", value: "HOUSES" },
  { id: "pets", name: "Pets", value: "PETS" },
  { id: "utility", name: "Utility", value: "UTILITY" },
];

const GooglePhotos: React.FunctionComponent = () => {
  const [type, setType] = useState<string>("ALL_MEDIA");
  const [nextPage, setNextPage] = useState<string>("");

  const { photos, loading, error, nextPageToken } = usePhotos(type, nextPage);

  if (error) {
    return (
      <List navigationTitle={error.type}>
        <List.EmptyView title={error.message} />
      </List>
    );
  }

  const setTypeAndClearPageToken = (value: string) => {
    setType(value);
    setNextPage("");
  };

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Zero}
      filtering={false}
      isLoading={loading}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort By" storeValue={false} onChange={(value) => setTypeAndClearPageToken(value)}>
          <Grid.Dropdown.Section title="Sort By">
            {sorts.map((type) => (
              <Grid.Dropdown.Item key={type.id} title={type.name} value={type.value} icon={{ source: type.icon }} />
            ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Categories">
            {categories.map((type) => (
              <Grid.Dropdown.Item key={type.id} title={type.name} value={type.value} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {photos.map((photo) => (
        <Grid.Item
          key={photo.id}
          content={photo.baseUrl}
          actions={
            <ActionPanel>
              <Action.Push title="View" target={<Photo id={photo.id} />} icon={{ source: Icon.BlankDocument }} />
              <Action
                title="Next Page"
                icon={{ source: Icon.ArrowRight }}
                onAction={() => setNextPage(nextPageToken ?? "")}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.CopyToClipboard
                title="Copy Link"
                content={photo.productUrl}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Download"
                icon={{ source: Icon.Download }}
                onAction={() => downloadMedia(photo.baseUrl, photo.filename, photo.mimeType)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />

              <Action.OpenInBrowser url={photo.productUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};

export default function Command() {
  return withGoogleAuth(<GooglePhotos />);
}

const Photo = ({ id }: { id: string }) => {
  const { photo, loading, error } = usePhoto(id);

  if (error) {
    showToast(Toast.Style.Failure, "Error", error);
  }

  return (
    <Detail
      isLoading={loading}
      markdown={`![${photo?.filename}](${photo?.baseUrl})`}
      navigationTitle={photo?.filename}
      actions={
        <ActionPanel>
          <Action
            title="Download"
            icon={{ source: Icon.Download }}
            onAction={() => downloadMedia(photo?.baseUrl ?? "", photo?.filename ?? "", photo?.mimeType ?? "")}
          />
          <Action.OpenInBrowser url={photo?.productUrl ?? ""} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Filename" text={photo?.filename} />
          <Detail.Metadata.Label title="MIME Type" text={photo?.mimeType} />
          <Detail.Metadata.Label
            title="Created"
            text={photo?.mediaMetadata?.creationTime && new Date(photo?.mediaMetadata?.creationTime).toLocaleString()}
          />
          <Detail.Metadata.Label title="Width" text={photo?.mediaMetadata?.width.toString() + "px"} />
          <Detail.Metadata.Label title="Width" text={photo?.mediaMetadata?.height.toString() + "px"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="View in Google Photos" target={photo?.productUrl ?? ""} text="Open in Browser" />
        </Detail.Metadata>
      }
    />
  );
};
