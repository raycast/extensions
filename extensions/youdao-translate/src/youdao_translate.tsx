import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Detail, Form, getSelectedText, Icon, List, useNavigation } from "@raycast/api";

import { translateAPI } from "./apis/translate";
import { TranslateResult, TranslateWebResult } from "../types";
import { LANGUAGES } from "./consts";
import { ErrorMessage } from "./components/error_message";
import { generateErrorMessage } from "./utils";

interface translateRequest {
  content: string;
  from_language: string;
  to_language: string;
}

function LanguageFormDDropdown(props: { id: string; title: string }) {
  const { id, title } = props;

  return (
    <Form.Dropdown id={id} title={title} defaultValue="auto">
      <Form.Dropdown.Section title="Auto">
        <Form.Dropdown.Item value="auto" title="Auto choose language" />
      </Form.Dropdown.Section>
      <Form.Dropdown.Section title="Language">
        {Object.keys(LANGUAGES).map((key: string) => (
          <Form.Dropdown.Item key={key} value={LANGUAGES[key as keyof typeof LANGUAGES]} title={key} />
        ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}

function TranslateResultActionPanel(props: { copy_content: string; url: string | undefined }) {
  const { copy_content, url } = props;
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={copy_content} />
      {url ? <Action.OpenInBrowser url={url} /> : null}
    </ActionPanel>
  );
}

function Translate(props: { content: string | undefined; from_language: string; to_language: string }) {
  const [translate_result, set_translate_result] = useState<TranslateResult>({
    requestId: "",
    query: "",
    basic: {},
    isWord: false,
    l: "",
    translation: undefined,
    web: undefined,
    webdict: { url: "" },
    errorCode: "",
  });

  const { content, from_language, to_language } = props;

  if (content === "" || content === undefined) {
    const errorMessage = `
* Content can not be blank`;
    return <ErrorMessage errorMessage={errorMessage} />;
  }
  useEffect(() => {
    (async () => {
      const response = await translateAPI(content, from_language, to_language);
      if (!response) return;
      set_translate_result(response);
    })();
  }, []);

  if (translate_result && translate_result.errorCode && translate_result.errorCode !== "0") {
    return <ErrorMessage errorMessage={generateErrorMessage(translate_result.errorCode)} />;
  }
  if (content.split(" ").length == 1) {
    return (
      <List isLoading={translate_result.errorCode === "" && translate_result.isWord}>
        {translate_result.translation ? (
          <List.Section title="Translate">
            {translate_result.translation.map((item: string, index: number) => (
              <List.Item
                key={index}
                title={item}
                icon={{ source: Icon.Dot, tintColor: Color.Red }}
                actions={
                  <TranslateResultActionPanel
                    copy_content={item}
                    url={
                      translate_result.webdict && translate_result.webdict.url
                        ? translate_result.webdict.url
                        : undefined
                    }
                  />
                }
              />
            ))}
          </List.Section>
        ) : null}
        {translate_result.basic && translate_result.basic.explains && translate_result.basic.explains.length > 0 ? (
          <List.Section title="Detail">
            {translate_result.basic.explains.map((item: string, index: number) => (
              <List.Item
                key={index}
                title={item}
                icon={{ source: Icon.Dot, tintColor: Color.Blue }}
                actions={
                  <TranslateResultActionPanel
                    copy_content={item}
                    url={
                      translate_result.webdict && translate_result.webdict.url
                        ? translate_result.webdict.url
                        : undefined
                    }
                  />
                }
              />
            ))}
          </List.Section>
        ) : null}
        {translate_result.web && translate_result.web.length > 0 ? (
          <List.Section title="Web Translate">
            {translate_result.web.map((item: TranslateWebResult, index: number) => (
              <List.Item
                key={index}
                title={item.value.join(", ")}
                icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
                subtitle={item.key}
                actions={
                  <TranslateResultActionPanel
                    copy_content={item.value.join(", ")}
                    url={
                      translate_result.webdict && translate_result.webdict.url
                        ? translate_result.webdict.url
                        : undefined
                    }
                  />
                }
              />
            ))}
          </List.Section>
        ) : null}
      </List>
    );
  } else {
    let result = "";
    translate_result.translation?.forEach((value) => {
      result += `${value}`;
    });
    return (
      <Detail
        isLoading={translate_result.errorCode === "" && !translate_result.isWord}
        markdown={result}
        actions={
          <TranslateResultActionPanel
            copy_content={result}
            url={translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined}
          />
        }
      />
    );
  }
}

export default function Main() {
  const { push } = useNavigation();
  const [select, set_select] = useState<string>();
  useEffect(() => {
    (async () => {
      try {
        const selected_text = await getSelectedText();
        set_select(selected_text);
      } catch (e) {
        set_select("");
      }
    })();
  }, []);
  return (
    <Form
      actions={
        <ActionPanel title="Translate">
          <Action.SubmitForm
            title="Translate"
            onSubmit={(input: translateRequest) => {
              push(
                <Translate
                  content={input.content || select}
                  to_language={input.to_language}
                  from_language={input.from_language}
                />
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" id="content" placeholder={select !== "" ? select : "Text to translate"} />
      <Form.Separator />
      <LanguageFormDDropdown id="from_language" title="From" />
      <LanguageFormDDropdown id="to_language" title="To" />
    </Form>
  );
}
