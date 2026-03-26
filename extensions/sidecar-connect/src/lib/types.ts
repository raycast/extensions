export interface SidecarDevice {
  id: string;
  name: string;
  isConnected: boolean;
  isWired: boolean;
}

export interface StoredDevice {
  id: string;
  name: string;
  isFavorite: boolean;
  lastConnected?: number;
}
