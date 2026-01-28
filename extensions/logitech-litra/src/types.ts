export interface Device {
  device_type: string;
  serial_number: string;
  device_path: string;
  is_on: boolean;
  brightness_in_lumen: number;
  temperature_in_kelvin: number;
  minimum_brightness_in_lumen: number;
  maximum_brightness_in_lumen: number;
  minimum_temperature_in_kelvin: number;
  maximum_temperature_in_kelvin: number;
}
