import { ITrace } from "../trace/type";
import { ITalk, ITalkDataResult } from "../type";

export class ILlm {
  // @ts-expect-error ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async chat(chatData: ITalk): Promise<any>;
  // @ts-expect-error ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepareResponse(chatData: ITalk, stream: boolean, trace: ITrace, answer: any): ITalkDataResult;
}
