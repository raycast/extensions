type PromiseFunctionWithOneArg<T> = (arg: T) => Promise<void>;
interface BaseHook<T> {
  data: T;
  isLoading: boolean;
}

export type QuestionHook = BaseHook<string> & { update: PromiseFunctionWithOneArg<string> };
