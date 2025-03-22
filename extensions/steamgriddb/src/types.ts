import { Grid } from "@raycast/api";
import { SGDBImage as DBImage } from "steamgriddb";
import { ComponentProps } from "react";

export type { SGDBGame } from "steamgriddb";

export type SGDBImage = DBImage & {
  width: number;
  height: number;
};

export enum ImageType {
  Grids = "Grids",
  Heroes = "Heroes",
  Logos = "Logos",
  Icons = "Icons",
}

export type AspectRatio = ComponentProps<typeof Grid>["aspectRatio"];
