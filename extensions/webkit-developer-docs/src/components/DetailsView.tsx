import { List } from "@raycast/api";
import { Doc } from "../types";
import { JSDomConverter, Renderer } from "html2commonmark";

const converter = new JSDomConverter();
const renderer = new Renderer();

export const DetailsView = ({ doc }: { doc: Doc }) => (
  <List.Item.Detail markdown={doc.title + "\n\n" + renderer.render(converter.convert(doc.text))} />
);
