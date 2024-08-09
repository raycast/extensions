import lunary from "lunary";
import { ITalk } from "../type";
import { ITraceHelper, newTraceHelper } from "./type";

export const TRACE_LUNARY = "lunary";

export class LunaryTrace {
  protected key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected trace: any | undefined;
  protected traceHelperObject: ITraceHelper = newTraceHelper();

  constructor(key: string | undefined) {
    if (!key) {
      throw new Error("KEY is not defined");
    }

    this.key = key;
    this.#initialize();
  }

  #initialize() {
    if (this.trace === undefined) {
      const t = lunary;
      t.init({ appId: process.env.LUNARY_PUBLIC_KEY });

      this.trace = t;
    }
  }

  changeHelper(data: ITraceHelper) {
    this.traceHelperObject = data;
  }

  init(chatData: ITalk, tags: string[]) {
    if (!this.trace) throw new Error("TRACE is not initialized");

    const obj = {
      runId: chatData.id,
      userId: chatData.user.id,
      name: chatData.llm.model,
      input: chatData.conversation.history,
    };
    if (tags !== undefined) {
      // @ts-expect-error ignore
      obj.tags = tags;
    }

    this.trace.trackEvent("llm", "start", obj);
  }

  llmStart(chatData: ITalk) {
    if (!this.trace) throw new Error("TRACE is not initialized");

    this.trace.trackEvent("llm", "end", {
      runId: chatData.id,
    });
  }

  llmFinish() {
    if (!this.trace) throw new Error("TRACE is not initialized");

    this.trace.trackEvent("llm", "end", {
      output: {
        role: "ai",
        text: this.traceHelperObject.output,
      },
      tokensUsage: {
        completion: this.traceHelperObject.token.completion,
        prompt: this.traceHelperObject.token.prompt,
      },
    });
  }

  end() {
    if (!this.trace) throw new Error("TRACE is not initialized");
  }
}
