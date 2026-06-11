export interface SidecarDevice {
  id: string;
  name: string;
  isConnected: boolean;
}

export interface StoredDevice {
  id: string;
  name: string;
  isFavorite: boolean;
  lastConnected?: number;
}
