import { LangFuseTrace } from "./langfuse";
import { LunaryTrace } from "./lunary";
import { ITalk } from "../type";
import { ITrace, ITraceHelper, newTraceHelper } from "./type";

export const TRACE_LANGFUSE = "langfuse";

export class Trace implements ITrace {
  protected langFuseTrace: LangFuseTrace | undefined;
  protected lunaryTrace: LunaryTrace | undefined;
  protected traceHelperObject: ITraceHelper = newTraceHelper();

  init(langFuse: LangFuseTrace | undefined, lunary: LunaryTrace | undefined): this {
    try {
      if (langFuse) {
        this.langFuseTrace = langFuse;
      }
      if (lunary) {
        this.lunaryTrace = lunary;
      }
      return this;
    } catch (error) {
      return this;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changeHelper(data: any | undefined) {
    if (data !== undefined) {
      this.traceHelperObject = Object.assign(this.traceHelperObject, data);

      if (this.langFuseTrace) {
        this.langFuseTrace.changeHelper(this.traceHelperObject);
      }
      if (this.lunaryTrace) {
        this.lunaryTrace.changeHelper(this.traceHelperObject);
      }
    }

    return this.traceHelperObject;
  }

  start(chatData: ITalk, tags: string[]) {
    if (this.langFuseTrace) {
      this.langFuseTrace.init(chatData, tags);
    }
    if (this.lunaryTrace) {
      this.lunaryTrace.init(chatData, tags);
    }
  }

  llmStart(chatData: ITalk) {
    if (this.langFuseTrace) {
      this.langFuseTrace.llmStart(chatData);
    }
    if (this.lunaryTrace) {
      this.lunaryTrace.llmStart(chatData);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  llmFinish(chatData: ITalk) {
    if (this.langFuseTrace) {
      this.langFuseTrace.llmFinish();
    }
    if (this.lunaryTrace) {
      this.lunaryTrace.llmFinish();
    }
  }

  finish() {
    if (this.langFuseTrace) {
      this.langFuseTrace.end();
    }
    if (this.lunaryTrace) {
      this.lunaryTrace.end();
    }
  }
}
