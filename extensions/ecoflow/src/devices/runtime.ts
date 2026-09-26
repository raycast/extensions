import { createEcoFlowClient } from "../api/runtime";
import { EcoFlowService } from "./service";

export function createEcoFlowService(): EcoFlowService {
  return new EcoFlowService(createEcoFlowClient());
}
