import { MouseDevice, OperationResult } from "../domain/models";

export interface DeviceCatalog {
  list(): Promise<OperationResult<MouseDevice[]>>;
}
