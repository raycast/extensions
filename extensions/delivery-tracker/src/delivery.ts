export interface Delivery {
  id: string;
  name: string;
  trackingNumber: string;
  carrier: string;
  manualDeliveryDate?: Date;
  debug?: boolean;
}
