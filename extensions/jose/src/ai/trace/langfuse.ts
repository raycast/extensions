import Langfuse, { LangfuseTraceClient } from "langfuse";
import { ITalk } from "../type";
import { ITraceHelper, newTraceHelper } from "./type";

export const TRACE_LANGFUSE = "langfuse";

export class LangFuseTrace {
  protected keySecret: string;
  protected keyPublic: string;
  protected host: string;
  protected trace: Langfuse | undefined;
  protected traceObject: LangfuseTraceClient | undefined;
  protected traceHelperObject: ITraceHelper = newTraceHelper();

  constructor(keySecret: string | undefined, keyPublic: string | undefined, host: string | undefined) {
    if (!keySecret) {
      throw new Error("KEY SECRET is not defined");
    }
    if (!keyPublic) {
      throw new Error("KEY PUBLIC is not defined");
    }
    if (!host) {
      throw new Error("HOST is not defined");
    }

    this.keySecret = keySecret;
    this.keyPublic = keyPublic;
    this.host = host;
    this.#initialize();
  }

  #initialize() {
    if (this.trace === undefined) {
      this.trace = new Langfuse({
        secretKey: this.keySecret,
        publicKey: this.keyPublic,
        baseUrl: this.host,
      });
    }
  }

  changeHelper(data: ITraceHelper) {
    this.traceHelperObject = data;
  }

  init(chatData: ITalk, tags: string[]) {
    if (!this.trace) throw new Error("TRACE is not initialized");

    const obj = {
      id: chatData.id,
      name: chatData.llm.model,
      userId: chatData.user.id,
      input: chatData.conversation.history,
      metadata: {
        incoming: chatData,
      },
    };
    if (tags !== undefined) {
      // @ts-expect-error ignore
      obj.tags = tags;
    }

    this.traceObject = this.trace.trace(obj);
  }

  llmStart(chatData: ITalk) {
    if (!this.traceObject) throw new Error("TRACE is not initialized");

    this.traceObject = this.traceObject.generation({
      // input: openAiMessages,
      model: chatData.llm.model,
      // modelParameters: {
      //   temperature: 0.7,
      // },
      completionStartTime: new Date(),
    });
  }

  llmFinish() {
    if (!this.traceObject) throw new Error("TRACE is not initialized");

    this.traceObject = this.traceObject.generation({
      output: this.traceHelperObject.output,
      usage: {
        promptTokens: this.traceHelperObject.token.prompt,
        completionTokens: this.traceHelperObject.token.completion,
      },
    });
  }

  end() {
    if (!this.trace) throw new Error("TRACE is not initialized");

    this.trace.shutdownAsync();
  }
}
