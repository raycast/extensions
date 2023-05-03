import { Action, ActionPanel, Detail, LaunchProps, useNavigation } from "@raycast/api";
import { markdown } from "./utils/markdown";

interface NFTDetailProps {
  item: any;
}

export function NFTDetail({ item }: NFTDetailProps) {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={markdown(item?.smallPreviewImageUrl)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Address" text={item.address} />
          <Detail.Metadata.Label title="Owned Count" text={item.ownedCount} />
          {/* <Detail.Metadata.TagList title="Symbol">
            <Detail.Metadata.TagList.Item text={item.symbol} color={"#eed535"} />
          </Detail.Metadata.TagList> */}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Toke ID"
            target="https://www.pokemon.com/us/pokedex/pikachu"
            text={item.tokenID}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Pop" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
