/**
 * Basic information about the printer.
 */
export interface PrinterInfo {
  /** Printer firmware version */
  version: string;
  /** API version supported by the printer */
  api: string;
  /** Full firmware version string */
  firmware: string;
  /** Network hostname of the printer */
  hostname: string;
  /** Printer model identifier */
  model: string;
  /** Custom name assigned to the printer */
  name?: string;
}

/**
 * Temperature reading with actual and target values.
 */
export interface Temperature {
  /** Current temperature reading */
  actual: number;
  /** Target temperature setting */
  target: number;
  /** Temperature unit (always Celsius) */
  unit: "°C";
}

/**
 * Comprehensive status information about the printer and current job.
 */
export interface PrinterStatus {
  /** Current print job information */
  job: {
    /** Unique identifier for the print job */
    id: number;
    /** Print progress percentage (0-100) */
    progress: number;
    /** Estimated time remaining in seconds */
    time_remaining: number;
    /** Time spent printing in seconds */
    time_printing: number;
  };
  /** Storage device information */
  storage: {
    /** Current storage path */
    path: string;
    /** Storage device name */
    name: string;
    /** Whether the storage is read-only */
    read_only: boolean;
  };
  /** Printer state and settings */
  printer: {
    /** Current printer state (e.g., "PRINTING", "IDLE") */
    state: string;
    /** Current bed temperature */
    temp_bed: number;
    /** Target bed temperature */
    target_bed: number;
    /** Current nozzle temperature */
    temp_nozzle: number;
    /** Target nozzle temperature */
    target_nozzle: number;
    /** Current Z axis position in mm */
    axis_z: number;
    /** Material flow rate percentage */
    flow: number;
    /** Print speed percentage */
    speed: number;
    /** Hotend cooling fan speed percentage */
    fan_hotend: number;
    /** Part cooling fan speed percentage */
    fan_print: number;
  };
}

/**
 * Information about a file or folder on the printer.
 */
export interface FileInfo {
  /** File system name */
  name: string;
  /** Human-readable display name */
  display_name: string;
  /** Type of item */
  type: "PRINT_FILE" | "FOLDER";
  /** Whether the item is read-only */
  ro: boolean;
  /** Last modified timestamp (Unix epoch) */
  m_timestamp: number;
  /** Related file references */
  refs: {
    /** URL to download the file */
    download?: string;
    /** URL to file thumbnail */
    icon?: string;
  };
}

/**
 * List of files in a directory.
 */
export interface FileList {
  /** Always "FOLDER" for directory listings */
  type: "FOLDER";
  /** Whether the directory is read-only */
  ro: boolean;
  /** Directory name */
  name: string;
  /** Files and subdirectories in this directory */
  children: FileInfo[];
}

/**
 * Details about a print job.
 */
export interface JobDetails {
  /** Unique identifier for the job */
  id: number;
  /** Print progress percentage (0-100) */
  progress: number;
  /** Estimated time remaining in seconds */
  time_remaining: number;
  /** Time spent printing in seconds */
  time_printing: number;
}
