import { HookType, PromiseFunctionNoArgType, PromiseFunctionWithOneArgType } from "./hook";
import { ITalkAssistant } from "../ai/type";

export const AssistantDefault: ITalkAssistant[] = [];

export type AssistantHookType = HookType<ITalkAssistant> & {
  update: PromiseFunctionWithOneArgType<ITalkAssistant>;
  reload: PromiseFunctionNoArgType;
};
