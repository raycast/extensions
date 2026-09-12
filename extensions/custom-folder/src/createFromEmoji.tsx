import emojiData from "emoji-datasource-apple";
import { useEffect, useState } from "react";
import { Grid, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { base64ToFile } from "./utils/saveFile";
import EmojiForm from "./components/emojiForm";

export default function CreateFromEmoji() {
  const [searchText, setSearchText] = useState("");
  const [emoji, setEmoji] = useState("");
  const [filteredList, setFilteredList] = useState(emojiData);
  const [shouldExecute, setShouldExecute] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const emojiCategories = ["All", ...new Set(emojiData.map((item) => item.category))];

  const { push } = useNavigation();
  const { data, error } = useFetch(
    `https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-160/${emoji}`,
    {
      parseResponse: async (response) => {
        return await response.arrayBuffer();
      },

      keepPreviousData: true,
      execute: shouldExecute || false,
    },
  );

  const outputPath = "/tmp/cf-custom-emoji.png";
  useEffect(() => {
    if (data && data.byteLength > 0) {
      try {
        const buffer = Buffer.from(data);
        const base64String = buffer.toString("base64");

        base64ToFile(base64String, outputPath)
          .then(() => {
            push(<EmojiForm file={[outputPath]} />);
          })
          .catch(async (error) => {
            console.error("Error saving file:", error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to generate folder image",
            });
          });
      } catch (error) {
        console.error("Error converting data to base64:", error);
      }
    }

    if (error) {
      console.error("Error fetching image:", error);
    }
  }, [data]);

  useEffect(() => {
    const filteredByCategory =
      selectedCategory === "All" ? emojiData : emojiData.filter((item) => item.category === selectedCategory);
    const filteredBySearch = filteredByCategory.filter(
      (item) =>
        item.short_names.some((keyword) => keyword.toLowerCase().includes(searchText)) ||
        item?.name?.toLowerCase().includes(searchText),
    );
    setFilteredList(filteredBySearch);
  }, [searchText, selectedCategory]);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      filtering={false}
      onSearchTextChange={(e) => setSearchText(e.toLowerCase())}
      navigationTitle="Search Emoji"
      searchBarPlaceholder="Search your favorite emoji"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Dropdown With Items"
          onChange={(category) => {
            setSelectedCategory(category);
          }}
        >
          {emojiCategories?.map((category) => (
            <Grid.Dropdown.Item key={`category-${category}`} title={category} value={category} />
          ))}
        </Grid.Dropdown>
      }
    >
      {filteredList.map((item) => {
        return (
          <Grid.Item
            key={item.unified}
            title={item?.name.charAt(0).toUpperCase() + item?.name?.slice(1).toLowerCase()}
            content={`${String.fromCodePoint(...item.unified.split("-").map((u) => parseInt(u, 16)))}`}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => {
                    setEmoji(item?.image);
                    setShouldExecute(true);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
