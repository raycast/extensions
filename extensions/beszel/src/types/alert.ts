/**
 * @see https://github.com/henrygd/beszel/blob/main/beszel/internal/alerts/alerts.go#L40
 */
export interface Alert {
  /**
   * Unique ID for the alert
   */
  id: string;
  /**
   * User identifier of the creator
   */
  user: string;
  /**
   * System ID reference for the alert
   */
  system: string;
  /**
   * @example Status, CPU, Memory, Disk, Temperature, Bandwidth
   */
  name: "Status" | "CPU" | "Memory" | "Disk" | "Temperature" | "Bandwidth" | string;
  /**
   * If configured: minimum value before alerting
   */
  value?: number;
  /**
   * If configured: interval in minutes to measure
   */
  min?: number;
  /**
   * If the alert was triggered
   */
  triggered: boolean;
  updated: string;
  created: string;
}
