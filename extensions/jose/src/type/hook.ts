export interface BaseHookType<T> {
  data: T;
  isLoading: boolean;
}

export type HookType<T> = BaseHookType<T[]> & BaseFunctionHookType<T>;
export type HookOneType<T> = BaseHookType<T>;

interface BaseFunctionHookType<T> {
  add: PromiseFunctionWithOneArgType<T>;
  remove: PromiseFunctionWithOneArgType<T>;
  clear: PromiseFunctionNoArgType;
}

export type PromiseFunctionNoArgType = () => Promise<void>;
export type PromiseFunctionWithOneArgType<A> = (arg: A) => Promise<void>;
export type PromiseFunctionWithTwoArgType<A, B> = (arg_1: A, arg_2: B) => Promise<void>;
export type PromiseFunctionWithThreeArgType<A, B, C> = (arg_1: A, arg_2: B, arg_3: C) => Promise<void>;
