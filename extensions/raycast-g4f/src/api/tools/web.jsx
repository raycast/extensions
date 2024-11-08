import { Toast, showToast } from "@raycast/api";
import * as providers from "../providers.js";

import * as DDG from "duck-duck-scrape";
import { Preferences } from "../preferences.js";

export const webToken = "<|web_search|>",
  webTokenEnd = "<|end_web_search|>";
export const webSystemPrompt =
  "You are given access to make searches on the Internet. The format for making a search" +
  " is: 1. The user sends a message. 2. You will decide whether to make a search. If you choose to make a search, you will " +
  "output a single message, containing the word <|web_search|> (EXACTLY AS IT IS GIVEN TO YOU), followed by ONLY your web search query. " +
  "After outputting your search query, you MUST output the token <|end_web_search|> (EXACTLY AS IT IS GIVEN TO YOU) to denote the end of the search query. " +
  "Keep your search query concise as there is a 400 characters limit.\n" +
  "The system will then append the web search results at the end of the user message, starting with the token <|web_search_results|>. " +
  "Take note that the user CANNOT ACCESS the content under <|web_search_results|> - YOU should incorporate these results into your response. " +
  "Additionally, If the token <|web_search_results|> is present in the user's message, then you MUST NOT request another web search.\n\n" +
  "IMPORTANT! You should choose to search the web ONLY if ANY of the following circumstances are met:\n" +
  "1. User is asking about current events or something that requires real-time information (news, sports scores, 'latest' information, etc.)\n" +
  "2. User is asking about some term you are unfamiliar with (e.g. if it's a little-known term, if it's a person you don't know well, etc.)\n" +
  "3. User is asking about anything that involves numerical facts (e.g. distances between places, population count, sizes, date and time, etc.)\n" +
  "4. User explicitly asks you to search or provide links to references.\n" +
  "If the user's query does NOT require a web search, YOU MUST NEVER run one for no reason.\n" +
  "However, NEVER refuse to search the web if the user asks you to provide such information.\n\n" +
  "When using web search results, you are encouraged to cite references where appropriate, using inline links in standard markdown format.\n" +
  "You are also allowed to make use of web search results from previous messages, if they are STRONGLY RELEVANT to the current message.\n\n" +
  "When you are not running a web search, respond completely as per normal - there is NO NEED to mention that you're not searching. \n" +
  "Do your best to be informative. However, you MUST NOT make up any information. If you think you might not know something, search for it.\n";
export const systemResponse = "Understood. I will strictly follow these instructions in this conversation.";

// shorter version of the web search prompt, optimised for function calling
// loosely based on the ChatGPT prompt
export const webSystemPrompt_ChatGPT = `
# Function calling: web_search
You have the tool \`web_search\`. Use the \`web_search\` function in the following circumstances:
    - User is asking about current events or something that requires real-time information (weather, sports scores, etc.)
    - User is asking about some term you are unfamiliar with (it might be new)
    - User explicitly asks you to search or provide links to references

Given a query that requires retrieval, you will:
1. Call the web_search function to get a list of results.
2. Write a response to the user based on these results.

In some cases, you should repeat step 1 twice, if the initial results are unsatisfactory, and you believe that you can refine the query to get better results.
`;

// a tool to be passed into OpenAI-compatible APIs
export const webSearchTool = {
  type: "function",
  function: {
    name: "web_search",
    description: webSystemPrompt_ChatGPT,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The query to search for",
        },
      },
      required: ["query"],
    },
  },
};

export const getWebResult = async (query) => {
  console.log("Web search query:", query);
  await showToast(Toast.Style.Animated, "Searching the web");

  try {
    const searchResults = await DDG.search(query, {
      safeSearch: DDG.SafeSearchType.OFF,
    });
    return processWebResults(searchResults.results);
  } catch (e) {
    await showToast(Toast.Style.Failure, "Web search failed");
    return "No results found.";
  }
};

// Wrapper for returning web results in a readable format
export const processWebResults = (results, maxResults = 15) => {
  // Handle undefined results
  if (!results || results.length === 0) {
    return "No results found.";
  }

  let answer = "";
  for (let i = 0; i < Math.min(results.length, maxResults); i++) {
    let x = results[i];
    let rst = `${i + 1}.\nURL: ${x["url"]}\nTitle: ${x["title"]}\nContent: ${x["description"]}\n\n`;
    answer += rst;
  }
  return answer;
};

export const formatWebResult = (webResponse, webQuery = null) => {
  return `\n\n<|web_search_results|> ${webQuery ? `for "${webQuery}` : ""}":\n\n` + webResponse;
};

// Get the formatted web search result. This should be used over getWebResult in most cases
// as it truncates long queries and formats the result.
export const getFormattedWebResult = async (query) => {
  query = query.substring(0, 400); // Limit query length to 400 characters

  const webResponse = await getWebResult(query);
  return formatWebResult(webResponse, query);
};

export const has_native_web_search = (provider) => {
  return providers.function_supported_providers.includes(provider);
};

// Check if web search should be enabled.
// If called in AI commands, we return a boolean - whether to use web search or not.
// Otherwise, we return a string - the mode of web search.
// Note: providers that support function calling should handle web search separately
export const web_search_mode = (type, provider = null) => {
  const pref = Preferences["webSearch"];
  if (type === "gpt") {
    // AI commands
    return ["balanced", "always"].includes(pref) && !has_native_web_search(provider);
  } else if (type === "chat") {
    // AI Chat
    return pref === "balanced" ? "auto" : pref;
  } else {
    return pref;
  }
};
