import DetailsView from "@components/ItemDetail";
import { OpenPublisherStore } from "@components/OpenPublisherStore";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { GraphicPublication } from "@types";

interface Props {
  publication: GraphicPublication;
  isShowingDetail: boolean;
  handleAction: (value: boolean | ((prevVar: boolean) => boolean)) => void;
}

export function ListItem({ publication, isShowingDetail: showingDetail, handleAction }: Props) {
  const props: Partial<List.Item.Props> = showingDetail
    ? {
        detail: <DetailsView publication={publication} />,
      }
    : { accessories: [{ icon: Icon.Coins }, { text: `$${publication.price}.00` }] };
  return (
    <List.Item
      title={`${publication.name} #${publication.volume}`}
      icon={{ source: publication.frontImageUrl, mask: Image.Mask.Circle, fallback: Color.Blue }}
      {...props}
      actions={
        <ActionPanel>
          <Action
            title="Toggle Detailed View"
            onAction={() => handleAction((prev: boolean) => !prev)}
            icon={Icon.AppWindowSidebarLeft}
          />
          <ActionPanel.Submenu title="Search in...">
            <OpenPublisherStore
              publisher="Sanborns"
              title={publication.name}
              storeUrl="https://www.sanborns.com.mx/resultados?query={param}"
            />
            <OpenPublisherStore
              publisher="Buscalibre México"
              title={publication.name}
              storeUrl="https://www.buscalibre.com.mx/libros/search?q={param}"
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
