import { MoonshotProvider } from "./moonshot";
import { OpenaiProvider } from "./openai";
import { RaycastProvider } from "./raycast";

export const PROVIDERS_MAP = {
  openai: OpenaiProvider,
  raycast: RaycastProvider,
  moonshot: MoonshotProvider,
};
