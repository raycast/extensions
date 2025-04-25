export interface Delivery {
  id: string;
  name: string;
  trackingNumber: string;
  carrier: string;
  manualDeliveryDate?: Date;
  manualMarkedAsDelivered?: boolean;
  debug?: boolean;
}
