import { Color } from "@raycast/api";
import { Package } from "./package";
import { updateUspsTracking, ableToTrackUspsRemotely, urlToUspsTrackingWebpage } from "./carriers/usps";
import { updateUpsTracking, ableToTrackUpsRemotely, urlToUpsTrackingWebpage } from "./carriers/ups";
import { updateFedexTracking, ableToTrackFedexRemotely, urlToFedexTrackingWebpage } from "./carriers/fedex";
import { Delivery } from "./delivery";

interface Carrier {
  id: string;
  name: string;
  color: Color;
  updateTracking: (delivery: Delivery) => Promise<Package[]>;
  ableToTrackRemotely: () => boolean;
  urlToTrackingWebpage: (delivery: Delivery) => string;
}

const carriers: Carrier[] = [
  {
    id: "usps",
    name: "USPS",
    color: Color.Blue,
    updateTracking: updateUspsTracking,
    ableToTrackRemotely: ableToTrackUspsRemotely,
    urlToTrackingWebpage: urlToUspsTrackingWebpage,
  },
  {
    id: "ups",
    name: "UPS",
    color: Color.Orange,
    updateTracking: updateUpsTracking,
    ableToTrackRemotely: ableToTrackUpsRemotely,
    urlToTrackingWebpage: urlToUpsTrackingWebpage,
  },
  {
    id: "fedex",
    name: "FedEx",
    color: Color.Purple,
    updateTracking: updateFedexTracking,
    ableToTrackRemotely: ableToTrackFedexRemotely,
    urlToTrackingWebpage: urlToFedexTrackingWebpage,
  },
];

export default new Map(carriers.map((carrier) => [carrier.id, carrier]));
