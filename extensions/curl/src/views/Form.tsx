import { Fragment, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, Icon } from "@raycast/api";
import { headerKeys, methods, makeObject } from "../../utils";
import ResultView from "./Result";
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const curlString = require("curl-string");
interface Identifiable {
  [key: string]: string | number;
}

interface Header extends Identifiable {
  key: string;
  value: string;
}

export default function FormView({ push }: { push: (component: React.ReactNode) => void }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("https://jsonplaceholder.typicode.com/todos/1");
  const [headers, setHeaders] = useState<Header[]>([{ key: "Content-Type", value: "application/json" }]);
  const [headerSearchTexts, setHeaderSearchTexts] = useState<(string | undefined)[]>([]);
  const [body, setBody] = useState<string>("");

  async function handleSubmit() {
    setIsLoading(true);
    let response;

    const payload = {
      url,
      method,
      headers: makeObject(headers),
      ...(method !== "GET" &&
        method !== "DELETE" && {
          data: {
            ...JSON.parse(body.replace("```\n\b\b", "")),
          },
        }),
    };

    axios({ ...payload })
      .then(async (res) => {
        response = res;
        const result = { method, response };

        const curlOptions = {
          method,
          headers: makeObject(headers),
          ...(method !== "GET" &&
            method !== "DELETE" && {
              data: {
                ...JSON.parse(body.replace("```\n\b\b", "")),
              },
            }),
        };

        const curl = curlString(url, curlOptions);

        await LocalStorage.setItem(
          method != "GET" && method != "DELETE"
            ? `${method}-${url}-${body.replace("```\n\b\b", "")}`
            : `${method}-${url}`,
          JSON.stringify({ ...payload, meta: { title: "", description: "" } }),
        );
        push(<ResultView result={result as never} curl={curl} />);
      })
      .catch((err) => {
        showToast({
          title: "Error",
          message: err.message,
          style: Toast.Style.Failure,
        });
      })
      .finally(() => setIsLoading(false));
  }

  function handleAddHeader() {
    setHeaders([...headers, { key: "", value: "" }]);
  }

  function handleRemoveHeader() {
    const newHeaders: Header[] = [...headers];
    newHeaders.pop();
    setHeaders(newHeaders);
  }

  function handleHeaderState(type: string, index: number, payload: string) {
    const newHeaders: Header[] = [...headers];
    newHeaders[index][type] = payload;
    setHeaders(newHeaders);
  }

  function handleSearchTextChange(index: number, payload: string) {
    handleHeaderState("key", index, "");
    const newHeaderSearchTexts = [...headerSearchTexts];
    payload = payload.trim();
    newHeaderSearchTexts[index] = payload === "" ? undefined : payload;
    setHeaderSearchTexts(newHeaderSearchTexts);
  }

  function filterHeaderOptions(index: number, option: string) {
    const search = headerSearchTexts[index];
    return search === undefined || option.toLowerCase().includes(search);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Make Request" icon={Icon.Rocket} onSubmit={handleSubmit} />
          <Action
            title="Add Headers"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => {
              handleAddHeader();
            }}
          />
          <Action
            title="Remove Last Header"
            icon={Icon.Minus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            onAction={() => {
              handleRemoveHeader();
            }}
          />
        </ActionPanel>
      }
    >
      {/* Method */}
      <Form.Dropdown id="method" title="Method" onChange={(payload) => setMethod(payload)}>
        {methods.map((method) => (
          <Form.Dropdown.Item key={method} value={method} title={method} />
        ))}
      </Form.Dropdown>

      {/* URL */}
      <Form.TextField
        id="url"
        title="URL"
        placeholder="http://localhost"
        value={url}
        onChange={(value) => setUrl(value)}
      />

      <Form.Separator />

      {/* Headers */}
      <Form.Description title="Headers" text="⌘H Add" />
      {headers.length &&
        headers.map((_, index) => {
          return (
            <Fragment key={`header-${index}`}>
              <Form.Dropdown
                id={`header-key-${index}`}
                title="Key"
                onChange={(key) => handleHeaderState("key", index, key)}
                value={headers[index].key}
                onSearchTextChange={(text) => handleSearchTextChange(index, text)}
              >
                {headerSearchTexts[index] !== undefined && (
                  <Form.Dropdown.Item
                    key={`header-${-1}-key`}
                    value={headerSearchTexts[index]!}
                    title={headerSearchTexts[index]!}
                  />
                )}
                {headerKeys
                  .filter((option) => filterHeaderOptions(index, option))
                  .map((key, idx) => (
                    <Form.Dropdown.Item key={`header-${idx}-key`} value={key} title={key} />
                  ))}
              </Form.Dropdown>
              <Form.TextField
                id={`header-value-${index}`}
                title="Value"
                placeholder="Header value"
                value={headers[index].value}
                onChange={(value) => handleHeaderState("value", index, value)}
              />
            </Fragment>
          );
        })}

      {headers.length > 1 && <Form.Description title="" text="⌘⇧H Remove Last" />}

      {method !== "GET" && method !== "DELETE" && (
        <>
          <Form.Separator />
          <Form.Description title="Body" text="Inline JSON only" />
          <Form.TextArea
            id="body"
            title=""
            enableMarkdown
            value={JSON.parse(JSON.stringify(body, null, 2))}
            onChange={(value) => setBody(value)}
            onFocus={() => {
              if (!body.includes("```")) {
                setBody("```\n\b\b" + body);
              }
            }}
          />
        </>
      )}
    </Form>
  );
}
