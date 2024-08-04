import { Toast } from "@raycast/api";
import { Trace } from "../../ai/trace/trace";
import { LangFuseTrace } from "../../ai/trace/langfuse";
import { LunaryTrace } from "../../ai/trace/lunary";
import { ILlm } from "../../ai/llm/type";
import { AnthropicLLM, LLM_ANTHROPIC } from "../../ai/llm/anthropic";
import { CohereLLM, LLM_COHERE } from "../../ai/llm/cohere";
import { GroqLLM, LLM_GROQ } from "../../ai/llm/groq";
import { LLM_OLLAMA, OllamaLLM } from "../../ai/llm/ollama";
import { LLM_OPENAI, OpenaiLLM } from "../../ai/llm/openai";
import { LLM_PERPLEXITY, PerplexityLLM } from "../../ai/llm/perplexity";
import { LLM_BINARY, BinaryLLM } from "../../ai/llm/binary";
import {
  GetAnthropicApi,
  GetCohereApi,
  GetGroqApi,
  GetLangfuseApi,
  GetLunaryApi,
  GetOllamaApi,
  GetOpenaiApi,
  GetPerplexityApi,
} from "../../type/config";
import { initData, ITalk, newTalkDataResult } from "../../ai/type";

export async function RunLocal(
  chatData: ITalk,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<ITalk | undefined> {
  chatData = initData(chatData);
  chatData.llm.stream = true;

  let langFuseTrace = undefined;
  let lunaryTrace = undefined;
  if (GetLangfuseApi().enable) {
    langFuseTrace = new LangFuseTrace(GetLangfuseApi().secret, GetLangfuseApi().public, GetLangfuseApi().url);
  }
  if (GetLunaryApi().enable) {
    lunaryTrace = new LunaryTrace(GetLunaryApi().key);
  }

  // eslint-disable-next-line no-useless-catch
  try {
    const trace = new Trace();
    trace.init(langFuseTrace, lunaryTrace);
    trace.start(chatData, [`llm:${chatData.llm.llm}`, `stream:${chatData.llm.stream}`]);
    let llm: ILlm | undefined = undefined;

    trace.llmStart(chatData);
    switch (chatData.llm.llm) {
      case LLM_ANTHROPIC:
        llm = new AnthropicLLM(
          chatData.llm.object?.useLocalOrEnv === "local" ? chatData.llm.object?.apiKeyOrUrl : GetAnthropicApi().key
        );
        break;
      case LLM_BINARY:
        chatData.llm.stream = false;

        llm = new BinaryLLM();
        break;
      case LLM_COHERE:
        llm = new CohereLLM(
          chatData.llm.object?.useLocalOrEnv === "local" ? chatData.llm.object?.apiKeyOrUrl : GetCohereApi().key
        );
        break;
      case LLM_GROQ:
        llm = new GroqLLM(
          chatData.llm.object?.useLocalOrEnv === "local" ? chatData.llm.object?.apiKeyOrUrl : GetGroqApi().key
        );
        break;
      case LLM_OLLAMA:
        chatData.llm.stream = false;
        llm = new OllamaLLM(
          chatData.llm.object?.useLocalOrEnv === "local" ? chatData.llm.object?.apiKeyOrUrl : GetOllamaApi().url
        );
        break;
      case LLM_OPENAI:
        llm = new OpenaiLLM(
          chatData.llm.object?.useLocalOrEnv === "local" ? chatData.llm.object?.apiKeyOrUrl : GetOpenaiApi().key
        );
        break;
      case LLM_PERPLEXITY:
        llm = new PerplexityLLM(
          chatData.llm.object?.useLocalOrEnv === "local" ? chatData.llm.object?.apiKeyOrUrl : GetPerplexityApi().key
        );
        break;
    }

    if (llm === undefined) {
      throw new Error("Unknown llm: " + chatData.llm.llm);
      return;
    }

    const answer = await llm.chat(chatData);

    if (!answer.stream) {
      const r = llm.prepareResponse(chatData, answer.stream, trace, answer.data);

      if (chatData.result === undefined) {
        chatData.result = newTalkDataResult();
      }
      chatData.result = r;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interaction.setData((prev: any) => {
        return prev.map((a: ITalk) => {
          if (a.id === chatData.id) {
            return chatData;
          }
          return a;
        });
      });

      setTimeout(async () => {
        interaction.setStreamData(undefined);
      }, 5);
      interaction.setLoading(false);

      interaction.toast.title = "Got your answer!";
      interaction.toast.style = Toast.Style.Success;
    } else {
      for await (const chunk of answer.data) {
        const r = llm.prepareResponse(chatData, answer.stream, trace, chunk);

        if (r.finish) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          interaction.setData((prev: any) => {
            return prev.map((a: ITalk) => {
              if (a.id === chatData.id) {
                return chatData;
              }
              return a;
            });
          });

          setTimeout(async () => {
            interaction.setStreamData(undefined);
          }, 5);

          interaction.setLoading(false);

          interaction.toast.title = "Got your answer!";
          interaction.toast.style = Toast.Style.Success;
          return chatData;
        }
        if (chatData.result === undefined) {
          chatData.result = newTalkDataResult();
        }
        chatData.result.content += r.content;

        interaction.setStreamData({ ...chatData });
      }
    }

    trace.finish();
    return chatData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw error;
  }
}
