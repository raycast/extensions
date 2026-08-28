import { Grid, Icon } from "@raycast/api";
import { SGDBImage as DBImage } from "steamgriddb";
import { ComponentProps } from "react";

export type { SGDBGame } from "steamgriddb";

export type SGDBImage = DBImage & {
  width: number;
  height: number;
};

export const imageTypes = [
  { value: "Grids", title: "Grids", icon: Icon.AppWindowGrid2x2 },
  { value: "Heroes", title: "Heroes", icon: Icon.Image },
  { value: "Logos", title: "Logos", icon: Icon.Heading },
  { value: "Icons", title: "Icons", icon: Icon.StarCircle },
] as const;

export type ImageType = (typeof imageTypes)[number];
export type ImageTypeValue = ImageType["value"];

export type AspectRatio = ComponentProps<typeof Grid>["aspectRatio"];
