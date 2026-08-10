export interface Simulator {
  udid: string;
  deviceTypeIdentifier: string;
  isAvailable: boolean;
}

export interface Device {
  device: string;
  model: string;
  identifier: string;
  image: string;
  resolution: string;
  year: number;
  os_last: string;
  os_orig: string;
  display_size: string;
  display_type: string;
  display_ppi: string;
  aspect_ratio: string;
  scale_factor: string;
  color_profile: string | null;
}

interface Preferences {
  device: string;
}
