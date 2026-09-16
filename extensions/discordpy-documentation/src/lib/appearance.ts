import { Color, Icon } from "@raycast/api";
import { EntryKind } from "./types";

export const KIND_ICON: Record<EntryKind, Icon> = {
  class: Icon.Box,
  method: Icon.Code,
  function: Icon.Code,
  event: Icon.Bolt,
  attribute: Icon.Tag,
  property: Icon.Gauge,
  exception: Icon.ExclamationMark,
  data: Icon.Dot,
  guide: Icon.Book,
};

export const KIND_COLOR: Record<EntryKind, Color> = {
  class: Color.Blue,
  method: Color.Purple,
  function: Color.Purple,
  event: Color.Yellow,
  attribute: Color.Green,
  property: Color.Green,
  exception: Color.Red,
  data: Color.SecondaryText,
  guide: Color.Orange,
};
