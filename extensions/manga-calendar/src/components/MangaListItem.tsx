import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import DetailsView from "./DetailsView";
import { Manga, Publisher } from "../types";
import { OpenPublisherStore } from "./OpenPublisherStore";

const publishers: Publisher = {
  "Panini Comics México - Manga": {
    editorial: "Panini México",
    storeUrl: "https://tiendapanini.com.mx/catalogsearch/result/?q={param}",
  },
  "Editorial Kamite - Manga": {
    editorial: "Kamite",
    storeUrl: "https://kamite.com.mx/buscar?controller=search&poscats=0&s={param}",
  },
  "Penguin Random House": {
    editorial: "Distrito Manga México",
    storeUrl: "https://www.penguinlibros.com/mx/?mot_q={param}#",
  },
  Mangaline: {
    editorial: "Mangaline México",
    storeUrl: "https://mangaline.com.mx/tienda/?product_cat&s={param}&post_type=product",
  },
};

interface Props {
  manga: Manga;
}

export default function MangaListItem({ manga }: Props) {
  const { editorial, storeUrl } = publishers[manga.editorial];
  return (
    <List.Item
      title={`${manga.name} #${manga.volume}`}
      subtitle={manga.editorial}
      icon={{ source: manga.frontImageUrl, mask: Image.Mask.Circle, fallback: Color.Blue }}
      accessories={[{ icon: Icon.Coins }, { text: `$${manga.price}.00` }]}
      actions={
        <ActionPanel>
          <Action.Push title="Details" target={<DetailsView manga={manga} />} />
          <ActionPanel.Submenu title="Search in...">
            <OpenPublisherStore publisher={editorial} title={manga.name} storeUrl={storeUrl} />
            <OpenPublisherStore
              publisher="Sanborns"
              title={manga.name}
              storeUrl="https://www.sanborns.com.mx/resultados?query={param}"
            />
            <OpenPublisherStore
              publisher="Buscalibre México"
              title={manga.name}
              storeUrl="https://www.buscalibre.com.mx/libros/search?q={param}"
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
