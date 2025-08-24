import { ActionPanel, Action, showToast, Toast, Image, Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import Service, { TextureSearchTexture } from "./service";

const service = new Service();

interface TextureType {
  type: string;
  name: string;
  imageUrl: string;
  url: string;
}

const textureTypes = [
  {
    name: "Skins",
    type: "SKIN",
    imageUrl: `https://skin.laby.net/api/render/skin/%s.png?shadow=true&height=300&width=250`,
    url: `https://laby.net/skin/%s`,
  },
  {
    name: "Capes",
    type: "CAPE",
    imageUrl: `https://skin.laby.net/api/render/cape/%s.png?shadow=true&height=300&width=250`,
    url: `https://laby.net/cape/%s`,
  },
];

export default function Command() {
  const [type, setType] = useState<TextureType>(textureTypes[0]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TextureSearchTexture[]>([]);
  const [isLoading, setLoading] = useState(true);

  const search = async () => {
    setLoading(true);

    return await service
      .searchTextures(type.type, query)
      .then((res) => {
        setResults(res.textures);
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, "Error searching textures", err.message);
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    (async () => {
      await search();
    })();
  }, [query, type]);

  return (
    <Grid
      isLoading={isLoading}
      throttle={true}
      aspectRatio={"3/4"}
      columns={6}
      searchBarPlaceholder="Search for tags"
      onSearchTextChange={async (query) => setQuery(query.trim())}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select type"
          onChange={(type) => setType(textureTypes.filter((t) => t.type === type)[0])}
        >
          {textureTypes.map((type) => (
            <Grid.Dropdown.Item value={type.type} title={type.name} key={type.type} />
          ))}
        </Grid.Dropdown>
      }
    >
      {results.map((entry) => {
        return (
          <Grid.Item
            content={{
              source: type.imageUrl.replace("%s", entry.imageHash),
              mask: Image.Mask.RoundedRectangle,
            }}
            key={entry.imageHash}
            title={entry.name === undefined ? entry.useCount.toLocaleString() + " Users" : entry.name}
            subtitle={entry.name === undefined ? "" : entry.useCount.toLocaleString() + " Users"}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={type.url.replace("%s", entry.imageHash)} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
