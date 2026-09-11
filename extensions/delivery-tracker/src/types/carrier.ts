import { Color, Image } from "@raycast/api";
import { Package } from "./package";
import { Delivery } from "./delivery";

export interface Carrier {
  id: string;
  name: string;
  color: Color;
  icon: Image.ImageLike;
  updateTracking: (delivery: Delivery) => Promise<Package[]>;
  ableToTrackRemotely: () => boolean;
  urlToTrackingWebpage: (delivery: Delivery) => string;
}
