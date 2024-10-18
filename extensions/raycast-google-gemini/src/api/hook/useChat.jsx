import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import {
  Action,
  ActionPanel,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import fs from "fs";
import fetch, { Headers } from "node-fetch";
globalThis.fetch = fetch;
globalThis.Headers = Headers;

import { resolve } from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  executeShellCommand,
  getRetrieval,
  GoogleSearch,
  pathOrURLToImage,
  rawHTMLByURL,
  retrievalTypes,
} from "../utils";

const {
  apiKey,
  defaultModel,
  searchApiKey,
  searchEngineID,
  enableMathjax,
  enableCodeExecution,
  temperature,
  topP,
  topK,
} = getPreferenceValues();

const DOWNLOAD_PATH = resolve(environment.supportPath, "response.md");
const safetySettings = [];
for (const category of Object.keys(HarmCategory)) {
  if (category != HarmCategory.HARM_CATEGORY_UNSPECIFIED) {
    safetySettings.push({ category: category, threshold: HarmBlockThreshold.BLOCK_NONE });
  }
}
const generationConfig = {
  maxOutputTokens: 50000,
  temperature: 0.0,
  topP: 0.01,
  topK: 1,
};

const googleSearchFunctionDeclaration = {
  name: "google",
  parameters: {
    type: "OBJECT",
    description: "Set the query and how many docs to return.",
    properties: {
      query: {
        type: "STRING",
        description: "The query to search google for.",
      },
      topN: {
        type: "NUMBER",
        description: "Return top N related documents.",
      },
    },
    required: ["query"],
  },
};

const getFullContextFunctionDeclaration = {
  name: "getFullContext",
  parameters: {
    type: "OBJECT",
    description: "Set the url of the online document that you want to retrieve.",
    properties: {
      url: {
        type: "STRING",
        description: "The url of the online document that you want to retrieve.",
      },
    },
    required: ["url"],
  },
};

// Executable function code. Put it in a map keyed by the function name
// so that you can call it once you get the name string from the model.
const apiFunctions = {
  google: async ({ query, topN = 5 }) => {
    return await GoogleSearch(query, searchApiKey, searchEngineID, topN);
  },
  getFullContext: async ({ url }) => {
    return [await rawHTMLByURL(url)];
  },
};

export function useChat(props) {
  const { query: argQuery } = props.arguments;
  var { searchQuery: argGoogle } = props.arguments;
  var { docLink: argURL } = props.arguments;
  argGoogle = argGoogle || argQuery;
  argURL = argURL || "";
  const context = props.launchContext || {};
  generationConfig.temperature = parseFloat(temperature);
  generationConfig.topP = parseFloat(topP);
  generationConfig.topK = parseInt(topK);
  const { push, pop } = useNavigation();
  const [markdown, setMarkdown] = useState(context.markdown || "");
  const [metadata, setMetadata] = useState(context.metadata || []);
  const [loading, setLoading] = useState(false);
  const [historyJson, storedHistoryJson] = useState(context.history || []);
  const chatID = useRef(context.chatID || Date.now().toString());
  const rawAnswer = useRef("");
  const lastQuery = useRef(argQuery);

  async function handleErrorWithRetry(error, retryClosure, toastMessage) {
    console.error(error);
    push(
      <Detail
        markdown={error.message}
        // action for retry
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.Reply}
              onAction={() => {
                pop();
                retryClosure();
              }}
            />
          </ActionPanel>
        }
      />,
    );
    await showToast({
      style: Toast.Style.Failure,
      title: toastMessage,
      message: error.message,
    });
  }

  // press pagedown
  const appleScript = `osascript -e 'tell application "System Events" to key code 121'`;
  // scroll down whenever chat context changes
  useEffect(() => {
    // sleep 200ms first
    setTimeout(() => {
      executeShellCommand(appleScript);
    }, 200);
  }, [markdown]);

  const getResponse = async (query, enable_vision = false, retrievalType = retrievalTypes.None, displayQuery = "") => {
    lastQuery.current = query;
    const textTemplate = `\n\n👤: \n\n\`\`\`\n${displayQuery || query}\n\`\`\` \n\n 🤖: \n\n`;
    var historyText = markdown + textTemplate;
    setMarkdown(historyText + "...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    const start = Date.now();
    try {
      // retrieval first, no repeat if metadata not empty
      var retrievalObjects = [];
      if ([retrievalTypes.Google, retrievalTypes.URL].includes(retrievalType) && metadata.length == 0) {
        retrievalObjects = await getRetrieval(
          fileManager,
          argGoogle,
          retrievalType,
          searchApiKey,
          searchEngineID,
          argURL,
        );
      }
      // get images ready, if metadata not empty, no need to repeat
      if (enable_vision && metadata.length == 0) {
        const { fileUrl, res: imagePart } = await pathOrURLToImage(argURL);
        retrievalObjects.push({
          href: fileUrl,
          title: "image",
          content: imagePart,
        });
        console.log(fileUrl);
        const imageTemplate = `👤: \n\n\`\`\`\n${displayQuery || query}\n\`\`\` \n\n ![image](${fileUrl}) \n\n 🤖: \n\n`;
        historyText = imageTemplate;
      }
      // get attachments ready
      if (retrievalObjects.length > 0) setMetadata(retrievalObjects);
      const messageInfo = [query, ...retrievalObjects.map((o) => o.content)];
      // begin chat
      setMarkdown(historyText + "...");
      setLoading(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Waiting for Gemini...",
      });

      // TODO: for now, not allowed to enable function call & code execution at the same time
      // disable codeExecution if function call is enabled historically
      var tools = enableCodeExecution ? { codeExecution: {} } : {};
      if (retrievalType == retrievalTypes.Function || (historyJson.length > 0 && metadata.length > 0)) {
        tools = {
          functionDeclarations: [googleSearchFunctionDeclaration, getFullContextFunctionDeclaration],
        };
      }
      const model = genAI.getGenerativeModel({
        model: defaultModel,
        generationConfig: generationConfig,
        safetySettings: safetySettings,
        tools: [tools],
      });
      const chat = model.startChat({
        history: historyJson,
      });

      var result;
      var text = "";
      // function call conflicts with streamedIO
      if (retrievalType != retrievalTypes.Function) {
        result = await chat.sendMessageStream(messageInfo);
        // post process of response text
        // TODO: workaround (try catch) for stream parsing bug with code execution
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            text += chunkText;
            setMarkdown(historyText + text);
            executeShellCommand(appleScript);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        result = await chat.sendMessage(messageInfo);
        // only the first call is executed
        var calls = result.response.functionCalls();
        while (calls && calls.length > 0 && calls[0]) {
          const call = calls[0];
          setMarkdown(
            historyText + `calling \`${call.name}\` with args:\n \`\`\`js\n${JSON.stringify(call.args)}\n\`\`\`\n`,
          );
          const apiResponse = await apiFunctions[call.name](call.args);
          if (call.name == "google") setMetadata(apiResponse);
          // Indicating
          await showToast({
            style: Toast.Style.Animated,
            title: "Thinking about the next step ...",
          });
          // auto reply with response
          result = await chat.sendMessage([
            {
              functionResponse: {
                name: call.name,
                response: {
                  docs: apiResponse,
                },
              },
            },
          ]);
          calls = result.response.functionCalls();
        }
        text = result.response.text();
      }
      // post process of response text
      const history = await chat.getHistory();
      storedHistoryJson(history);
      rawAnswer.current = text;
      setMarkdown(historyText + text);
      // mathjax equation replacing
      if (enableMathjax) {
        fs.writeFileSync(DOWNLOAD_PATH, text);
        console.log("New response saved to " + DOWNLOAD_PATH);
        // replace equations with images
        const scriptPath = resolve(environment.assetsPath, "markdownMath", "index.js");
        const newMarkdown = executeShellCommand(`node ${scriptPath} "${DOWNLOAD_PATH}"`);
        setMarkdown(historyText + newMarkdown);
      }
      // show success toast
      setLoading(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Response Loaded",
        message: `Load finished in ${(Date.now() - start) / 1000} seconds.`,
      });
    } catch (e) {
      setLoading(false);
      handleErrorWithRetry(
        e,
        () => getResponse(query, enable_vision, retrievalType, displayQuery),
        "No response from Gemini",
      );
    }
  };

  useEffect(() => {
    if (historyJson.length > 0)
      LocalStorage.setItem(
        chatID.current,
        JSON.stringify({ query: lastQuery.current, markdown: markdown, metadata: metadata, history: historyJson }),
      );
  }, [markdown, metadata, historyJson]);

  return useMemo(
    () => ({
      markdown,
      metadata,
      rawAnswer,
      loading,
      getResponse,
    }),
    [markdown, metadata, rawAnswer, loading, getResponse],
  );
}
