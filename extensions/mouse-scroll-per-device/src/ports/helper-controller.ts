import { HelperStatus, OperationResult } from "../domain/models";

export interface HelperController {
  status(): Promise<OperationResult<HelperStatus>>;
  install(): Promise<OperationResult<HelperStatus>>;
  repair(): Promise<OperationResult<HelperStatus>>;
  start(): Promise<OperationResult<HelperStatus>>;
  stop(): Promise<OperationResult<HelperStatus>>;
  requestPermissions(): Promise<OperationResult<HelperStatus>>;
  openInputMonitoringSettings(): Promise<OperationResult<void>>;
  openAccessibilitySettings(): Promise<OperationResult<void>>;
}
