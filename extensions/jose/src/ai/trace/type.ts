export interface ITraceHelper {
  output: string;
  token: {
    completion: number;
    prompt: number;
  };
}

export const newTraceHelper = (): ITraceHelper => {
  return {
    output: "",
    token: {
      completion: 0,
      prompt: 0,
    },
  };
};

export class ITrace {
  // @ts-expect-error ignore
  init(langFuse: LangFuseTrace | undefined, lunary: LunaryTrace | undefined);
  // @ts-expect-error ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changeHelper(data: any | undefined);
  // @ts-expect-error ignore
  start(chatData: IChat, tags: string[]);
  // @ts-expect-error ignore
  llmStart(chatData: IChat);
  // @ts-expect-error ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  llmFinish(completion: any, tPromt: number, tCompletion: number);
  // @ts-expect-error ignore
  finish();
}
