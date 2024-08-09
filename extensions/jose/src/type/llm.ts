import { HookType, PromiseFunctionNoArgType, PromiseFunctionWithOneArgType } from "./hook";
import { ITalkLlm } from "../ai/type";

export const LlmDefault: ITalkLlm[] = [];

export type LlmHookType = HookType<ITalkLlm> & {
  update: PromiseFunctionWithOneArgType<ITalkLlm>;
  reload: PromiseFunctionNoArgType;
};
