import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  getSelectedText,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useChat } from "./hook/useChat";
import { retrievalTypes } from "./utils";

const getFullQuery = (query, context, examples) => {
  if (typeof context === "function") {
    return context(query, examples);
  }
  return `${context ? `${context}\n\n` : ""}${query}`;
};

export default (props, context, vision = false, retrievalType = retrievalTypes.None, examples = "") => {
  const { query: argQuery } = props.arguments;
  const { push, pop } = useNavigation();
  const { markdown, metadata, rawAnswer, loading, getResponse } = useChat(props);
  const [query, setQuery] = useState(argQuery);

  useEffect(() => {
    (async () => {
      try {
        if (!query) {
          setQuery(await getSelectedText());
        }
        if (query) {
          getResponse(
            getFullQuery(query, context, examples),
            vision,
            retrievalType,
            examples && getFullQuery(query, context, ""),
          );
        }
      } catch (e) {
        push(
          <Form
            actions={
              <ActionPanel>
                <Action.SubmitForm
                  onSubmit={async (values) => {
                    pop();
                    setQuery(values.query);
                  }}
                />
              </ActionPanel>
            }
          >
            <Form.TextArea id="query" title="Query" defaultValue={query} placeholder="Edit your query" />
          </Form>,
        );
      }
    })();
  }, [query]);

  return (
    <Detail
      markdown={markdown}
      metadata={
        metadata &&
        metadata.length > 0 && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Extra Context">
              {metadata.map((retrievalObject) => (
                <Detail.Metadata.TagList.Item
                  key={retrievalObject.href}
                  text={retrievalObject.title}
                  onAction={() => open(retrievalObject.href)}
                />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
          </Detail.Metadata>
        )
      }
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action
            title="Reply"
            icon={Icon.Reply}
            onAction={() => {
              push(
                <Form
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm
                        onSubmit={(values) => {
                          if (values.replyText) {
                            getResponse(values.replyText, vision, retrievalType);
                          } else {
                            showToast({
                              style: Toast.Style.Success,
                              title: "Cancelled reply",
                            });
                          }
                          pop();
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.TextArea id="replyText" title="reply with following text" placeholder="..." defaultValue={""} />
                </Form>,
              );
            }}
          />
          <Action.CopyToClipboard content={rawAnswer.current} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        </ActionPanel>
      }
    ></Detail>
  );
};
