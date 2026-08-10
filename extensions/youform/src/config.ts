import { getPreferenceValues, Icon, Image } from "@raycast/api";
import { BlockType } from "./types";

const { api_token } = getPreferenceValues<Preferences>();
export const API_URL = "https://app.youform.com/api/";
export const API_HEADERS = {
  Authorization: `Bearer ${api_token}`,
  Accept: "application/json",
};

export const BLOCK_TYPE_ICONS: Record<BlockType, Image.ImageLike> = {
  contact: Icon.Person,
  input: Icon.ShortParagraph,
  textarea: Icon.Paragraph,
  phone: Icon.Phone,
  text: Icon.Document,
  number: Icon.Hashtag,
  url: Icon.Link,
  radio: Icon.SquareEllipsis,
  checkbox: Icon.Checkmark,
  dropdown: Icon.EllipsisVertical,
  date: { source: Icon.Calendar, mask: Image.Mask.Circle },
  address: Icon.Pin,
  scheduler: Icon.Calendar,
  star_rating: Icon.Star,
  opinion_scale: Icon.FullSignal,
  ranking: Icon.NumberList,
  signature: Icon.Pencil,
  file_upload: Icon.Upload,
  payment: Icon.CreditCard,
  matrix: Icon.AppWindowGrid3x3,
  nps: Icon.Gauge,
};
