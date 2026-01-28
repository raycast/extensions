export type Label = {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};
export type CreateLabelRequest = {
  name: string;
  description: string;
};
export type Item = {
  id: string;
  assetId: string;
  name: string;
  description: string;
  quantity: number;
  insured: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  purchasePrice: number;
  labels: Label[];
};
type Attachment = {
  id: string;
};
export type DetailedItem = Item & {
  serialNumber: string;
  modelNumber: string;
  manufacturer: string;
  lifetimeWarranty: boolean;
  warrantyExpires: string;
  warrantyDetails: string;
  purchaseTime: string;
  purchaseFrom: string;
  soldTime: string;
  soldTo: string;
  soldPrice: number;
  soldNotes: string;
  notes: string;
  attachments: Attachment[];
};
export type CreateItemRequest = {
  locationId: string;
  name: string;
  quantity: number;
  description: string;
  labelIds: string[];
};

export type Location = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type GroupStatistics = {
  totalUsers: number;
  totalItems: number;
  totalLocations: number;
  totalLabels: number;
  totalItemPrice: number;
  totalWithWarranty: number;
};

export type MaintenanceLog = {
  completedDate: string;
  scheduledDate: string;
  name: string;
};
