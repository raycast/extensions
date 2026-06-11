export interface GrpcUiItem {
  title: string;
  url: string;
}

export interface StoredService extends GrpcUiItem {
  id: string;
}
