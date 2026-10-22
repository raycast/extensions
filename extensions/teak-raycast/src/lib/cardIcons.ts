import { Icon } from "@raycast/api";
import type { RaycastCard } from "./api";

const TYPE_ICONS: Record<string, Icon> = {
  audio: Icon.Waveform,
  document: Icon.Document,
  image: Icon.Image,
  link: Icon.Link,
  palette: Icon.Swatch,
  quote: Icon.QuoteBlock,
  text: Icon.Text,
  video: Icon.Video,
};

export const getCardTypeIcon = (card: Pick<RaycastCard, "type">): Icon =>
  TYPE_ICONS[card.type] ?? Icon.Document;
