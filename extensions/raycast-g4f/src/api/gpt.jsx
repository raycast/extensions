import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  Form,
  getSelectedText,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import * as providers from "./providers.js";

import throttle from "lodash.throttle";

import { help_action } from "../helpers/helpPage.jsx";
import { autoCheckForUpdates } from "../helpers/update.jsx";

import { Message, pairs_to_messages } from "../classes/message.js";
import { Preferences } from "./preferences.js";

import { truncate_chat } from "../helpers/helper.js";
import { plainTextMarkdown } from "../helpers/markdown.js";
import { getFormattedWebResult, systemResponse, web_search_mode, webSystemPrompt } from "./tools/web";

let generationStatus = { stop: false, loading: false };
let get_status = () => generationStatus.stop;

export default (
  props,
  {
    context = undefined,
    allowPaste = false,
    useSelected = false,
    requireQuery = false,
    showFormText = "",
    forceShowForm = false,
    otherReactComponents = [],
    processPrompt = null,
    allowUploadFiles = false,
    defaultFiles = [],
    useDefaultLanguage = false,
    webSearchMode = "off",
    displayPlainText = false,
    allowedProviders = null,
  } = {}
) => {
  // The parameters are documented here:
  // 1. props: We mostly use this parameter for the query value, which is obtained using props.arguments.query.
  // For example, the `Ask AI` command shows a "Query" box when the user types the command.
  // 2. context: A string to be added before the query value. This is usually a default prompt specific to each command.
  // For example, the `Summary` command has a context of "Summarize the given text."
  // 3. allowPaste: A boolean to allow pasting the response to the clipboard.
  // 4. useSelected: A boolean to use the selected text as the query. If we fail to get selected text,
  // either of the three following scenarios will happen depending on the query value and showFormText parameter:
  //    a. If query is provided, we will get response based on the query value.
  //    b. If showFormText string is provided, a Form will be shown with the showFormText parameter as the field title.
  //    c. If showFormText is not provided, an error will be shown and the command quits.
  // 5. requireQuery: A boolean to require a query, separate from selected text. Explanation:
  // By default, the selected text is taken to be the query. For example, the `Continue`, `Fix Code`... commands.
  // But other commands, like `Ask About Selected Text`, may want to use a query in addition to the selected text.
  // 6. showFormText: A string to be shown as the field title in the Form. If true, either of the three following
  // scenarios will happen depending on the query value and useSelected parameter:
  //    a. If useSelected is true, see useSelected documentation above.
  //    b. If useSelected is false, and query is provided, we will get response based on the query value.
  //    c. If useSelected is false, and query is not provided, a Form will be shown with the showFormText parameter as the field title.

  // 7. forceShowForm: Even if selected text is available, still show the form. In this case the default value
  // for the first field in the form will be the selected text. For example, `Translate` command has this set to true
  // because the user needs to select the target language in the form.
  // 8. otherReactComponents: An array of additional React components to be shown in the Form.
  // For example, `Translate` command has a dropdown to select the target language.
  // 9. processPrompt: A function to be called to get the final prompt. The usage is
  // processPrompt({context: context, query: query, selected: selected, values: otherReactComponents.values - if any}).
  // Both async and non-async functions are supported - in particular, we just always `await` the function.
  // 10. allowUploadFiles: A boolean to allow uploading files in the Form. If true, a file upload field will be shown.
  // 11. defaultFiles: Files to always include in the prompt. This is an array of file paths.
  // 12. useDefaultLanguage: A boolean to use the default language. If true, the default language will be used in the response.
  // 13. webSearchMode: A string to allow web search. If "always", we will always search.
  // Otherwise, if "auto", the extension preferences are followed.
  // 14. displayPlainText: A boolean to display the response as plain text. If true, we attempt to convert the markdown to plain text.
  // 15. allowedProviders: An array of allowed provider strings. If provided, only the providers in the array will be used.

  /// Init
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  const [page, setPage] = useState(Pages.Detail);
  const [markdown, _setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");
  const [lastQuery, setLastQuery] = useState({ text: "", files: [] });
  const [lastResponse, setLastResponse] = useState("");
  const [providerString, setProviderString] = useState(""); // global variable since it may be used outside the main function

  const setMarkdown = (text) => {
    if (displayPlainText) {
      _setMarkdown(plainTextMarkdown(text));
    } else {
      _setMarkdown(text);
    }
  };

  // Init parameters
  let { query: argQuery } = props.arguments ?? {};
  if (!argQuery) argQuery = props.fallbackText ?? "";

  // Input parameters: query - string, files - array of strings (file paths).
  const getResponse = async (query, { regenerate = false, files = [] } = {}) => {
    // This is a workaround for multiple generation calls - see the comment above the useEffect.
    if (generationStatus.loading) return;
    generationStatus.loading = true;

    // load provider and model
    const providerString =
      !allowedProviders || allowedProviders.includes(providers.default_provider_string())
        ? providers.default_provider_string()
        : allowedProviders[0];
    setProviderString(providerString);
    const info = providers.get_provider_info(providerString);
    // additional options
    let options = providers.get_options_from_info(info);

    let messages = [];

    // Modify the query before sending it to the API
    if (!regenerate) {
      // handle processPrompt
      if (processPrompt) {
        query = await processPrompt({ context: context, query: query, selected: selectedState });
      }

      // handle files: we combine files (files that the user uploads)
      // with defaultFiles (files that are passed as a parameter and are always included)
      files = [...defaultFiles, ...files];

      // handle default language
      if (useDefaultLanguage) {
        let defaultLanguage = Preferences["defaultLanguage"];
        if (defaultLanguage !== "English") {
          query = `The default language is ${defaultLanguage}. Respond in this language.\n\n${query}`;
        }
      }

      // handle web search
      if (webSearchMode === "always" || (webSearchMode === "auto" && web_search_mode("gpt", info.provider))) {
        // push system prompt
        messages = [
          new Message({ role: "user", content: webSystemPrompt }),
          new Message({ role: "assistant", content: systemResponse }),
          ...messages,
        ];

        // get web search results
        let webResults = await getFormattedWebResult(query);
        query = query + webResults;
      }
    }

    setLastQuery({ text: query, files: files });
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Response loading",
    });

    try {
      console.log(query);
      messages = [...messages, new Message({ role: "user", content: query, files: files })];

      // generate response
      let response = "";
      let elapsed = 0.001,
        chars,
        charPerSec;
      let start = Date.now();

      if (!info.stream) {
        response = await chatCompletion(info, messages, options);
        setMarkdown(response);

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
      } else {
        let loadingToast = await showToast(Toast.Style.Animated, "Response loading");
        generationStatus.stop = false;

        const _handler = (new_message) => {
          response = new_message;
          response = formatResponse(response, info.provider);
          setMarkdown(response);
          setLastResponse(response);

          elapsed = (Date.now() - start) / 1000;
          chars = response.length;
          charPerSec = (chars / elapsed).toFixed(1);
          loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
        };

        const handler = throttle(_handler, 100);

        await chatCompletion(info, messages, options, handler, get_status);

        handler.flush();
      }
      setLastResponse(response);

      await showToast({
        style: Toast.Style.Success,
        title: "Response finished",
        message: `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`,
      });

      // functions that run periodically
      await autoCheckForUpdates();
    } catch (e) {
      console.log(e);
      setMarkdown(
        "## Could not access GPT.\n\nPlease try another prompt, and if it still does not work, try switching to another provider. Please create an issue on GitHub."
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response failed",
      });
    }

    setIsLoading(false);
    generationStatus.loading = false;
  };

  // For currently unknown reasons, this following useEffect is rendered twice, both at the same time.
  // This results in getResponse() being called twice whenever a command is called directly (i.e. the form is not shown).
  // This problem has always been present, and it's also present in the original raycast-gemini.
  // We work around this by preventing any generation when the generationStatus.loading flag is set to true.
  useEffect(() => {
    (async () => {
      if (useSelected) {
        let systemPrompt = (context ? `${context}\n\n` : "") + (argQuery ? argQuery : "");

        let selected;
        try {
          selected = await getSelectedText();
        } catch (e) {
          selected = null;
        }
        if (selected && !selected.trim()) selected = null;

        // This is also part of the workaround for the double rendering issue. If we are currently generating a response
        // then we should not attempt to generate another response, or set the page to a Form.
        // We do this check here instead of at the beginning, because getSelectedText() is sequential and the two calls to it
        // will always complete one after the other. On the other hand, we can't check at the beginning because the two calls
        // are started at the exact same time.
        if (generationStatus.loading) return;

        setSelected(selected);

        // Before the rest of the code, handle forceShowForm
        if (forceShowForm) {
          setPage(Pages.Form);
          return;
        }

        // if not requireQuery, we use the selected text as the query
        if (!requireQuery) {
          // handle the case where we don't use selected text: if we already have a context & query. e.g. "Find Synonyms" command.
          // This is in fact not completely optimized, as we didn't have to get the selected text in the first place,
          // but it's a niche case and the branching is already complex enough.
          if (context && argQuery) {
            await getResponse(`${systemPrompt}`);
            return;
          }

          // if we need selected as query but it is not available, we will try to show a Form
          if (!selected) {
            if (showFormText) {
              setPage(Pages.Form);
            } else {
              // if no selected text is available and showing a form is not allowed, we will show an error
              await popToRoot();
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not get selected text",
              });
            }
          } else {
            await getResponse(`${systemPrompt}\n\n${selected}`);
          }
        } else {
          // requireQuery - we need a separate query
          // if a query is provided, then we use it as system prompt, and selected text as "query"
          if (argQuery) {
            await getResponse(`${systemPrompt}\n\n${selected}`);
          }

          // if no query is provided, we will need to obtain a separate query by showing a form
          else if (showFormText) {
            setPage(Pages.Form);
          }

          // if no query is provided and showing a form is not allowed, we will show an error
          else {
            await popToRoot();
            await showToast({
              style: Toast.Style.Failure,
              title: "No query provided",
            });
          }
        }
      } else {
        // !useSelected

        // Before the rest of the code, handle forceShowForm
        if (forceShowForm) {
          setPage(Pages.Form);
          return;
        }

        if (argQuery) {
          await getResponse(argQuery);
        } else {
          if (showFormText) {
            setPage(Pages.Form);
          } else {
            // if no query is provided and showing a form is not allowed, we will show an error
            await popToRoot();
            await showToast({
              style: Toast.Style.Failure,
              title: "No query provided",
            });
          }
        }
      }
    })();
  }, []);

  return page === Pages.Detail ? (
    <Detail
      actions={
        <ActionPanel>
          {allowPaste && <Action.Paste content={markdown} />}
          <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} />
          {(lastQuery.text || lastQuery.files?.length > 0) && (
            <Action
              title="Continue in Chat"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
              onAction={async () => {
                await launchCommand({
                  name: "aiChat",
                  type: LaunchType.UserInitiated,
                  context: { query: lastQuery, response: lastResponse, provider: providerString },
                });
              }}
            />
          )}
          {isLoading && (
            <Action
              title="Stop Response"
              icon={Icon.Pause}
              onAction={() => {
                generationStatus.stop = true;
              }}
              shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "/" }}
            />
          )}
          <Action
            title="Regenerate Response"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              if (isLoading) {
                let userConfirmed = false;
                await confirmAlert({
                  title: "Are you sure?",
                  message: "Response is still loading. Are you sure you want to regenerate it?",
                  icon: Icon.ArrowClockwise,
                  primaryAction: {
                    title: "Regenerate Response",
                    onAction: () => {
                      userConfirmed = true;
                    },
                  },
                  dismissAction: {
                    title: "Cancel",
                  },
                });
                if (!userConfirmed) {
                  return;
                }
              }

              await getResponse(lastQuery.text, { regenerate: true, files: lastQuery.files });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          {help_action()}
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values) => {
              setMarkdown("");

              let prompt;
              let systemPrompt = (context ? `${context}\n\n` : "") + (values.query ? values.query : "");
              let files = values.files || [];

              if (processPrompt) {
                // custom function
                prompt = await processPrompt({
                  context: context,
                  query: values.query,
                  selected: selectedState,
                  values: values,
                });
                processPrompt = null; // only call once
              } else if (useSelected && selectedState) {
                prompt = `${systemPrompt}\n\n${selectedState}`;
              } else {
                prompt = `${systemPrompt}`;
              }

              await getResponse(prompt, { files: files });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title={showFormText}
        id="query"
        defaultValue={argQuery ? argQuery : !requireQuery && selectedState ? selectedState : ""}
      />
      {allowUploadFiles && <Form.FilePicker title="Upload Files" id="files" />}
      {otherReactComponents}
    </Form>
  );
};

// Generate response using a chat context (array of Messages, NOT MessagePairs - conversion should be done before this)
// and options. This is the core function of the extension.
//
// if stream_update is passed, we will call it with stream_update(new_message) every time a chunk is received
// otherwise, this function returns an async generator (if stream = true) or a string (if stream = false)
// if status is passed, we will stop generating when status() is true
//
// also note that the chat parameter is an array of Message objects, and how it is handled is up to the provider modules.
// for most providers it is first converted into JSON format before being used.
export const chatCompletion = async (info, chat, options, stream_update = null, status = null) => {
  const provider = info.provider; // provider object
  // additional options
  options = providers.get_options_from_info(info, options);

  let response = await providers.generate(provider, chat, options, { stream_update });

  // stream = false
  if (typeof response === "string") {
    // will not be a string if stream is enabled
    response = formatResponse(response, provider);
    return response;
  }

  // streaming related handling
  if (provider.customStream) return; // handled in the provider
  if (stream_update) {
    await processStream(response, provider, stream_update, status);
    return;
  }
  return response;
};

// generate response. input: currentChat is a chat object from AI Chat; query (string) is optional
// see the documentation of chatCompletion for details on the other parameters
export const getChatResponse = async (currentChat, query = null, stream_update = null, status = null) => {
  // load provider and model
  const info = providers.get_provider_info(currentChat.provider);
  // additional options
  let options = providers.get_options_from_info(info, currentChat.options);

  // format chat
  let chat = pairs_to_messages(currentChat.messages, query);
  chat = truncate_chat(chat, info);

  // generate response
  return await chatCompletion(info, chat, options, stream_update, status);
};

// generate response using a chat context and a query, while forcing stream = false
export const getChatResponseSync = async (currentChat, query = null) => {
  let r = await getChatResponse(currentChat, query);
  if (typeof r === "string") {
    return r;
  }

  const info = providers.get_provider_info(currentChat.provider);
  let response = "";
  for await (const chunk of processChunks(r, info.provider)) {
    response = chunk;
  }
  response = formatResponse(response, info.provider);
  return response;
};

// format response using some heuristics
export const formatResponse = (response, provider = null) => {
  // eslint-disable-next-line no-constant-condition
  if (false && (provider.name === "Nexra" || provider.name === "BestIM")) {
    // replace escape characters: \n with a real newline, \t with a real tab, etc.
    response = response.replace(/\\n/g, "\n");
    response = response.replace(/\\t/g, "\t");
    response = response.replace(/\\r/g, "\r");
    response = response.replace(/\\'/g, "'");
    response = response.replace(/\\"/g, '"');

    // remove all remaining backslashes
    response = response.replace(/\\/g, "");

    // remove <sup>, </sup> tags (not supported apparently)
    response = response.replace(/<sup>/g, "");
    response = response.replace(/<\/sup>/g, "");
  }

  if (provider.name === "Blackbox") {
    // remove version number - example: remove $@$v=v1.13$@$ or $@$v=undefined%@$
    response = response.replace(/\$@\$v=.{1,30}\$@\$/, "");

    // remove sources - the chunk of text starting with $~~~$[ and ending with ]$~~~$
    // as well as everything before it
    const regex = /\$~~~\$\[[^]*]\$~~~\$/;
    let match = response.match(regex);
    if (match) {
      response = response.substring(match.index + match[0].length);
    }
  }

  return response;
};

// yield chunks incrementally from a response.
export const processChunksIncrementalAsync = async function* (response, provider) {
  // default case. response must be an async generator.
  yield* response;
};

export const processChunksIncremental = async function* (response, provider, status = null) {
  // same as processChunksIncrementalAsync, but stops generating as soon as status() is true
  // update every few chunks to reduce performance impact
  let i = 0;
  for await (const chunk of await processChunksIncrementalAsync(response, provider)) {
    if ((i & 15) === 0 && status && status()) break;
    yield chunk;
    i++;
  }
};

// instead of yielding incrementally, this function yields the entire response each time.
// this allows us to perform more complex operations on the response, such as adding a cursor icon.
// hence, when using the function, we will do `response = chunk` instead of `response += chunk`
export const processChunks = async function* (response, provider, status = null) {
  let r = "";

  // Experimental feature: Show a cursor icon while loading the response
  const useCursorIcon = Preferences["useCursorIcon"];
  const cursorIcon = " ●"; // const cursorIcon = "▋";

  for await (const chunk of await processChunksIncremental(response, provider, status)) {
    if (useCursorIcon) {
      // remove cursor icon if enabled
      r = r.slice(0, -cursorIcon.length);
    }

    // add the chunk
    r += chunk;

    if (useCursorIcon) {
      r += cursorIcon;
    }

    yield r;
  }

  if (useCursorIcon) {
    // remove cursor icon after response is finished
    r = r.slice(0, -cursorIcon.length);
    yield r;
  }
};

// a simple stream handler. upon each chunk received, we call stream_update(new_message)
export const processStream = async function (asyncGenerator, provider, stream_update, status = null) {
  for await (const new_message of processChunks(asyncGenerator, provider, status)) {
    stream_update(new_message);
  }
};
