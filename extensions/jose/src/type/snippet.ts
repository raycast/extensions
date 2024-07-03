import { HookType, PromiseFunctionNoArgType, PromiseFunctionWithOneArgType } from "./hook";
import { TalkSnippetType } from "./talk";

export const SnippetDefaultTemperature = "0.7";

export function GetNewSnippet(): undefined {
  return undefined;
}

export type SnippetHookType = HookType<TalkSnippetType> & {
  update: PromiseFunctionWithOneArgType<TalkSnippetType>;
  reload: PromiseFunctionNoArgType;
};
