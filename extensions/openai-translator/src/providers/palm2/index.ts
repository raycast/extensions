/* eslint-disable @typescript-eslint/no-unused-vars */

import { v1beta2 as generativeLanguage } from "@google-ai/generativelanguage";
import { GoogleAuth } from "google-auth-library";
import { Provider } from "../base";
import { Prompt, PromptBuilder, QuoteProcessor } from "../prompt";
import { TranslateMode, TranslateQuery } from "../types";
import { getErrorText } from "../utils";

const MODEL_NAME = "models/text-bison-001";

export default class extends Provider {
  private apikey: string;

  constructor({ apikey }: { apikey: string }) {
    super();
    this.apikey = apikey;
  }

  protected generatePrompt(query: TranslateQuery, builders: Record<TranslateMode, PromptBuilder>): Prompt {
    builders["translate"] = (prompt: Prompt) => {
      let { rolePrompt, commandPrompt, contentPrompt } = prompt;
      const { quoteProcessor = new QuoteProcessor(), meta: query } = prompt;
      const { content, isWordMode, targetLangCode, targetLang, toChinese } = query;
      if (isWordMode) {
        // 翻译为中文时，增加单词模式，可以更详细的翻译结果，包括：音标、词性、含义、双语示例。
        rolePrompt = `You are a translation engine. Please translate the provided word, please provide the word's original form, language, corresponding pronunciation (if available), all meanings (including parts of speech), and at least three bilingual example sentences. Please strictly follow the formatbelow for the translation results: "<Word>\\n[<Language>] · / <Word Pronunciation>\\n[<Part of Speech Abbreviation>] <Chinese Meaning>\\nExamples:\\n<Number>. <Example Sentence> (Translation of Example Sentence)"`;
        commandPrompt = "Sure, I got it. Please provide me with the word.";
        contentPrompt = `The word is: ${content}`;
        return { ...prompt, rolePrompt, commandPrompt, contentPrompt };
      } else {
        commandPrompt += ` Only translate the text between ${quoteProcessor.quoteStart} and ${quoteProcessor.quoteEnd}.`;
        contentPrompt = `${quoteProcessor.quoteStart}${content}${quoteProcessor.quoteEnd} =>`;
        if (targetLangCode === "xdbhw") {
          rolePrompt = "You are a seasoned scholar studying Chinese in the Chinese Department.";
          commandPrompt = `The content enclosed between ${quoteProcessor.quoteStart} and ${quoteProcessor.quoteEnd} is the original text. Please translate the original content into a modern vernacular style reminiscent of "The Call" in Chinese literature.`;
        } else if (targetLangCode === "jdbhw") {
          rolePrompt = "You are a seasoned scholar researching Chinese in the Chinese department.";
          commandPrompt = `The content enclosed between ${quoteProcessor.quoteStart} and ${quoteProcessor.quoteEnd} is the original text. Please translate the original content into modern vernacular style, reminiscent of "Dream of the Red Chamber".`;
        } else if (content.length < 5 && toChinese) {
          // 当用户的默认语言为中文时，查询中文词组（不超过5个字），展示多种翻译结果，并阐述适用语境。
          rolePrompt = `You are a translation engine, please translate the given text into ${targetLang}. Please provide three (if applicable) commonly used translation results: words or phrases, along with their corresponding contexts (explained in Chinese), pronunciation symbols, parts of speech, and bilingual examples. Present the information in the following format in Chinese:
                      <Number><Word or Phrase> · /<Pronunciation symbols>
                      [<Part of speech abbreviation>] <Context (explained in Chinese)>
                      Example: <Example sentence>(Translation of example sentence)`;
          commandPrompt = "";
        }
      }
      return { ...prompt, rolePrompt, commandPrompt, contentPrompt, quoteProcessor };
    };
    return super.generatePrompt(query, builders);
  }

  async doTranslate(query: TranslateQuery, prompt: Prompt) {
    const client = new generativeLanguage.TextServiceClient({
      authClient: new GoogleAuth().fromAPIKey(this.apikey),
    });
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt, quoteProcessor, meta } = prompt;

    const { isWordMode } = meta;

    const text = `System: ${rolePrompt}\n${assistantPrompts.map((prompt) => "User: " + prompt).join("\n")}${
      commandPrompt ? "Assistant: " + commandPrompt + "\n" : ""
    }User: ${contentPrompt}\nAssistant:`;

    let abort = false; //did we need lock?
    try {
      query.signal.addEventListener("abort", () => {
        if (!abort) {
          abort = true;
          query.onError("Abort");
        }
      });

      //FIXME google-gax didn't support AbortController try nice-grpc
      const [resp, _] = await client.generateText(
        {
          model: MODEL_NAME,
          stopSequences: quoteProcessor ? [quoteProcessor.quoteEnd] : null,
          temperature: isWordMode ? 0.7 : 0,
          prompt: {
            text,
          },
        },
        { timeout: 15 * 1000 }
      );

      if (resp.candidates && resp.candidates.length > 0) {
        const content = resp.candidates[0].output;
        let targetTxt = content?.replaceAll("\n", "\n\n") ?? "";
        if (quoteProcessor) {
          targetTxt = quoteProcessor.processText(targetTxt);
        }
        if (!abort) {
          query.onMessage({ content: targetTxt, role: "", isWordMode });
          query.onFinish("stop");
        }
      } else {
        if (resp.filters && resp.filters.length > 0) {
          query.onError(`filters: ${resp.filters.map((f) => f.reason).join(", ")}`);
        } else {
          query.onError("Unexcept error");
        }
      }
    } catch (error) {
      if (!abort) {
        query.onError(getErrorText(error));
      }
    }
  }
}
