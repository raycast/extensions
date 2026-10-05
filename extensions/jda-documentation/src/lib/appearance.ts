import { Color, Icon } from "@raycast/api";
import { EntryKind } from "./types";

export const KIND_ICON: Record<EntryKind, Icon> = {
  class: Icon.Box,
  interface: Icon.Layers,
  enum: Icon.List,
  annotation: Icon.AtSymbol,
  exception: Icon.ExclamationMark,
  record: Icon.Document,
  event: Icon.Bolt,
  method: Icon.Code,
  field: Icon.Tag,
  constant: Icon.Dot,
  initializer: Icon.Plus,
  package: Icon.Folder,
  guide: Icon.Book,
};

export const KIND_COLOR: Record<EntryKind, Color> = {
  class: Color.Blue,
  interface: Color.Blue,
  enum: Color.Magenta,
  annotation: Color.SecondaryText,
  exception: Color.Red,
  record: Color.Blue,
  event: Color.Yellow,
  method: Color.Purple,
  field: Color.Green,
  constant: Color.Green,
  initializer: Color.Purple,
  package: Color.SecondaryText,
  guide: Color.Orange,
};
