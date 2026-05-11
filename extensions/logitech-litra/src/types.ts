// V2 API response (litra CLI v2.x)
export interface DeviceV2 {
  device_type: string;
  serial_number: string;
  device_path: string;
  status: string;
  brightness_display: string;
  temperature_display: string;
  is_on: boolean;
  brightness_in_lumen: number;
  temperature_in_kelvin: number;
  minimum_brightness_in_lumen: number;
  maximum_brightness_in_lumen: number;
  minimum_temperature_in_kelvin: number;
  maximum_temperature_in_kelvin: number;
}

// V3 API response (litra CLI v3.x)
export interface DeviceV3 {
  device_type: string;
  device_type_display: string;
  has_back_side: boolean;
  serial_number: string;
  device_path: string;
  status_display: string;
  brightness_display: string;
  temperature_display: string;
  back_status_display: string;
  back_brightness_display: string;
  is_on: boolean;
  brightness_in_lumen: number;
  temperature_in_kelvin: number;
  minimum_brightness_in_lumen: number;
  maximum_brightness_in_lumen: number;
  minimum_temperature_in_kelvin: number;
  maximum_temperature_in_kelvin: number;
  is_back_on: boolean | null;
  back_brightness_percentage: number | null;
}

// Unified Device interface used throughout the extension
export interface Device {
  device_type: string; // Machine-readable device type: "glow", "beam", "beam_lx"
  device_type_display: string; // Human-readable device type: "Litra Glow", "Litra Beam", "Litra Beam LX"
  has_back_side: boolean;
  serial_number: string;
  device_path: string;
  status_display: string; // Human-readable status display
  brightness_display: string; // Human-readable brightness display
  temperature_display: string; // Human-readable temperature display
  back_status_display: string; // Human-readable back light status display
  back_brightness_display: string; // Human-readable back light brightness display
  is_on: boolean;
  brightness_in_lumen: number;
  temperature_in_kelvin: number;
  minimum_brightness_in_lumen: number;
  maximum_brightness_in_lumen: number;
  minimum_temperature_in_kelvin: number;
  maximum_temperature_in_kelvin: number;
  is_back_on: boolean | null;
  back_brightness_percentage: number | null;
}
