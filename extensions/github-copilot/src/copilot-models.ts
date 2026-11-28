import type { AI } from "@raycast/api";
import { getCopilotModels, streamCopilotCompletion } from "./services/inference";

export const getModels: AI.GetModels = () => getCopilotModels();

export const streamCompletion: AI.StreamCompletion = (model, request) => streamCopilotCompletion(model, request);
