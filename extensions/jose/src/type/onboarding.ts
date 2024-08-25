import { HookOneType, PromiseFunctionNoArgType } from "./hook";

export type OnboardingHookType = HookOneType<boolean> & {
  finish: PromiseFunctionNoArgType;
};
