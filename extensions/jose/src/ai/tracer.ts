import { LangChainTracer } from "langchain/callbacks";
import { Client } from "langsmith";
import { CallbackHandler } from "langfuse-langchain";
import { LunaryHandler } from "lunary/langchain";
import { GetApiLangFuse, GetApiLangSmith, GetApiLunary } from "../type/config";
import fetch from "node-fetch";
// @ts-expect-error ignore
globalThis.fetch = fetch;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TracerCallbacks = async (callbacks: any[]): Promise<any[]> => {
  if (GetApiLangFuse() !== undefined) {
    console.log("Using tracer `langFuse`");
    callbacks.push(
      new CallbackHandler({
        publicKey: GetApiLangFuse().public,
        secretKey: GetApiLangFuse().secret,
        baseUrl: GetApiLangFuse().host,
      })
    );
  }

  if (GetApiLunary() !== undefined) {
    console.log("Using tracer `lunary`");
    callbacks.push(
      new LunaryHandler({
        appId: GetApiLunary().key,
      })
    );
  }

  if (GetApiLangSmith() !== undefined) {
    console.log("Using tracer `langSmith`");
    callbacks.push(
      new LangChainTracer({
        client: new Client({
          apiUrl: GetApiLangSmith().host,
          apiKey: GetApiLangSmith().key,
        }),
        projectName: GetApiLangSmith().projectName,
      })
    );
  }

  return callbacks;
};
