export interface LightReport {
  node: string;
  mode: "on" | "off";
}

export interface AMSTray {
  id: string;
  tray_type?: string;
  tray_color?: string;
  remain?: number;
}

export interface AMSUnit {
  tray: AMSTray[];
}

export interface PrinterStatus {
  gcode_state?: string;
  mc_remaining_time?: number;
  layer_num?: number;
  total_layer_num?: number;
  subtask_name?: string;
  nozzle_temper?: number;
  bed_temper?: number;
  lights_report?: number | string | LightReport[];
  ams?: {
    ams: AMSUnit[];
  };
}

export interface SDFile {
  name: string;
  size: number;
  date: Date;
}

export interface BambuPreferences {
  ipAddress: string;
  accessCode: string;
  serialNumber: string;
  useAmsDefault: boolean;
}
