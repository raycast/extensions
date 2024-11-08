import fetch from "node-fetch";
import { randomUUID } from "crypto";
import { format_chat_to_prompt } from "../../classes/message.js";
import { sleep } from "../../helpers/helper.js";
import { DEFAULT_HEADERS } from "../../helpers/headers.js";

// Implementation ported from gpt4free MetaAI provider.

const url = "https://graph.meta.ai/graphql?locale=user";
const cookies_url = "https://www.meta.ai/";
const access_token_url = "https://www.meta.ai/api/graphql";

const generateOfflineThreadingId = () => {
  const randomValue = Math.floor(Math.random() * (1 << 22));
  const timestamp = Date.now();
  return ((timestamp << 22) | randomValue).toString();
};

const extractValue = (text, key = null, startStr = null, endStr = '",') => {
  if (!startStr) {
    startStr = `${key}":{"value":"`;
  }
  let start = text.indexOf(startStr);
  if (start >= 0) {
    start += startStr.length;
    const end = text.indexOf(endStr, start);
    if (end >= 0) {
      return text.substring(start, end);
    }
  }
  return null;
};

const formatCookies = (cookies) => {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
};

export const MetaAIProvider = {
  name: "MetaAI",
  generate: async function* (chat, options, { max_retries = 5 }) {
    let accessToken = null;
    let lsd = null;
    let cookies = null;

    const updateCookies = async () => {
      const response = await fetch(cookies_url, { method: "GET", headers: DEFAULT_HEADERS });
      const text = await response.text();
      cookies = {
        _js_datr: extractValue(text, "_js_datr"),
        abra_csrf: extractValue(text, "abra_csrf"),
        datr: extractValue(text, "datr"),
      };
      lsd = extractValue(text, null, '"LSD",[],{"token":"', '"}');
    };

    const updateAccessToken = async (birthday = "1999-01-01") => {
      const payload = {
        lsd: lsd,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "useAbraAcceptTOSForTempUserMutation",
        variables: JSON.stringify({
          dob: birthday,
          icebreaker_type: "TEXT",
          __relay_internal__pv__WebPixelRatiorelayprovider: 1,
        }),
        doc_id: "7604648749596940",
      };
      const headers = {
        ...DEFAULT_HEADERS,
        "x-fb-friendly-name": "useAbraAcceptTOSForTempUserMutation",
        "x-fb-lsd": lsd,
        "x-asbd-id": "129477",
        "alt-used": "www.meta.ai",
        "sec-fetch-site": "same-origin",
        cookie: formatCookies(cookies),
      };
      const response = await fetch(access_token_url, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams(payload),
      });
      const responseJson = await response.json();
      accessToken = responseJson.data.xab_abra_accept_terms_of_service.new_temp_user_auth.access_token;
    };

    const prompt = async function* (message) {
      if (!cookies) await updateCookies();
      if (!accessToken) await updateAccessToken();

      await sleep(500); // sleep for a bit to avoid rate limits

      const headers = {
        ...DEFAULT_HEADERS,
        "content-type": "application/x-www-form-urlencoded",
        cookie: formatCookies(cookies),
        origin: "https://www.meta.ai",
        referer: "https://www.meta.ai/",
        "x-asbd-id": "129477",
        "x-fb-friendly-name": "useAbraSendMessageMutation",
      };

      const payload = {
        access_token: accessToken,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "useAbraSendMessageMutation",
        variables: JSON.stringify({
          message: { sensitive_string_value: message },
          externalConversationId: randomUUID(),
          offlineThreadingId: generateOfflineThreadingId(),
          suggestedPromptIndex: null,
          flashVideoRecapInput: { images: [] },
          flashPreviewInput: null,
          promptPrefix: null,
          entrypoint: "ABRA__CHAT__TEXT",
          icebreaker_type: "TEXT",
          __relay_internal__pv__AbraDebugDevOnlyrelayprovider: false,
          __relay_internal__pv__WebPixelRatiorelayprovider: 1,
        }),
        server_timestamps: "true",
        doc_id: "7783822248314888",
      };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: new URLSearchParams(payload),
      });

      let lastSnippetLen = 0;
      let fetchId = null;

      // Sometimes the JSON-parseable response is split across multiple lines
      let prevLine = "";

      const reader = response.body;
      for await (let line of reader) {
        line = line.toString();

        try {
          line = JSON.parse(line);
        } catch (e) {
          prevLine += line;
          try {
            line = JSON.parse(prevLine);
            // Parsed JSON from multiple lines
            prevLine = "";
          } catch (e) {
            continue;
          }
        }

        try {
          const botResponseMessage = line?.data?.node?.bot_response_message || {};
          const streamingState = botResponseMessage.streaming_state;
          fetchId = botResponseMessage.fetch_id || fetchId;

          if (streamingState === "STREAMING" || streamingState === "OVERALL_DONE") {
            const snippet = botResponseMessage.snippet;
            const newSnippetLen = snippet.length;
            if (newSnippetLen > lastSnippetLen) {
              yield snippet.substring(lastSnippetLen);
              lastSnippetLen = newSnippetLen;
            }
          }

          prevLine = ""; // also reset prevLine if we parsed a line successfully
        } catch (e) {
          console.log(e);
        }
      }

      if (fetchId) {
        const sources = await fetchSources(fetchId);
        if (sources) {
          yield sources;
        }
      }
      if (lastSnippetLen === 0) {
        throw new Error("No response received");
      }
    };

    const fetchSources = async (fetchId) => {
      const headers = {
        ...DEFAULT_HEADERS,
        authority: "graph.meta.ai",
        "x-fb-friendly-name": "AbraSearchPluginDialogQuery",
      };

      const payload = {
        access_token: accessToken,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "AbraSearchPluginDialogQuery",
        variables: JSON.stringify({ abraMessageFetchID: fetchId }),
        server_timestamps: "true",
        doc_id: "6946734308765963",
      };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: new URLSearchParams(payload),
      });

      const text = await response.text();
      if (text.includes("<h1>Something Went Wrong</h1>")) {
        throw new Error("Response: Something Went Wrong");
      }

      const responseJson = JSON.parse(text);
      const message = responseJson.data?.message;
      if (message?.searchResults) {
        return "\n\n" + JSON.stringify(message.searchResults);
      }
      return null;
    };

    try {
      let chatPrompt = format_chat_to_prompt(chat);
      yield* prompt(chatPrompt);
    } catch (e) {
      if (max_retries > 0) {
        console.log(e, "Retrying...");
        yield* this.generate(chat, options, { max_retries: max_retries - 1 });
      } else {
        throw e;
      }
    }
  },
};
