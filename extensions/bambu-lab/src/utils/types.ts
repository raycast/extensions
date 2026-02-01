export interface Preferences {
  ipAddress: string;
  accessCode: string;
  serialNumber: string;
  useAmsDefault: boolean;
}

export interface LightReport {
  node: string;
  mode: string;
}

export interface PrinterStatus {
  gcode_state?: string;
  mc_remaining_time?: number;
  layer_num?: number;
  total_layer_num?: number;
  subtask_name?: string;
  nozzle_temper?: number;
  bed_temper?: number;
  lights_report?: number | string | Array<LightReport>;
  ams?: {
    ams: Array<{
      tray: Array<{
        id: string;
        tray_type?: string;
        tray_color?: string;
        remain?: number;
      }>;
    }>;
  };
}

export interface SDFile {
  name: string;
  size: number;
  date: Date;
}
