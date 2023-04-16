import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import axios, { AxiosError } from "axios";

import { useState } from "react";

const enum HTTP_METHOD {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}
type HttpRequest = {
  httpHeaderContent: string;
  httpBodyContent: string;
  httpRequestUrl: string;
  httpMethod: HTTP_METHOD;
};

function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export default function Command() {
  // React states
  const [useResponse, setResponse] = useState({});
  const [useUrlError, setUrlError] = useState<string | undefined>();
  const [useHeaderError, setHeaderError] = useState<string | undefined>();
  const [useBodyError, setBodyError] = useState<string | undefined>();
  const [useResponseError, setResponseError] = useState<string | undefined>();

  // Input placeholders
  const urlPlaceHolder = `https://example.com/`;
  const httpHeaderContentPlaceHolder = `{"Content-Type": "application/json", ...}`;
  const httpBodyContentPlaceHolder = `{"name": "John Doe", "age": 30, "job" : "programmer" ...}`;

  // Form submit handler
  async function handleSubmit(values: HttpRequest) {
    const { httpHeaderContent, httpBodyContent, httpRequestUrl, httpMethod } = values;

    // URL parsing
    let url = "";

    // URL validation
    if (httpRequestUrl.trim().length > 0) {
      try {
        const parsedUrl: URL = new URL(httpRequestUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          setUrlError("Invalid URL");
          return;
        }

        url = parsedUrl.toString();
        setUrlError(undefined);
      } catch (err) {
        setUrlError("Invalid URL");
        return;
      }
    } else {
      setUrlError("Invalid URL");
      return;
    }

    // Header parsing
    let headers: object = {
      "Content-Type": "application/json",
    };

    // Header object validation
    try {
      if (httpHeaderContent.trim().length > 0) {
        const parsedHeader = JSON.parse(httpHeaderContent);
        headers = { ...headers, ...parsedHeader };

        setHeaderError(undefined);
      }
    } catch (err) {
      setHeaderError("Invalid JSON");
      return;
    }

    // Data(Body) parsing
    let data: object = {};

    // Data(Body) object validation
    try {
      if (httpBodyContent.trim().length > 0) {
        const parsedData = JSON.parse(httpBodyContent);
        data = { ...data, ...parsedData };

        setBodyError(undefined);
      }
    } catch (err) {
      setBodyError("Invalid JSON");
      return;
    }

    try {
      const response = await axios({
        method: httpMethod,
        url,
        headers: headers,
        data: data,
      });

      setResponse(response.data);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setResponseError("Http Request Error!");
        if (error.response?.data) {
          const data = error.response.data;
          setResponse(data);
          showToast({ title: data["error"], message: data["message"].toString() });
        } else {
          setResponse(error.toJSON());
          showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
        }
      } else {
        setResponseError("Unknown Error!");
        showToast({ title: "Error", message: "", style: Toast.Style.Failure });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This form for simple H2TP request." />

      <Form.TextField
        id="httpRequestUrl"
        title="Request URL"
        error={useUrlError}
        placeholder={urlPlaceHolder}
        onChange={() => {
          setUrlError(undefined);
          setResponseError(undefined);
        }}
      ></Form.TextField>

      <Form.Dropdown id="httpMethod" title="HTTP Method">
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="POST" title="POST" />
        <Form.Dropdown.Item value="PUT" title="PUT" />
        <Form.Dropdown.Item value="PATCH" title="PATCH" />
        <Form.Dropdown.Item value="DELETE" title="DELETE" />
      </Form.Dropdown>

      <Form.TextArea
        id="httpHeaderContent"
        title="Http Request Header"
        error={useHeaderError}
        storeValue
        placeholder={httpHeaderContentPlaceHolder}
        onChange={() => {
          setHeaderError(undefined);
          setResponseError(undefined);
        }}
      />

      <Form.TextArea
        id="httpBodyContent"
        title="Http Request Body"
        error={useBodyError}
        storeValue
        placeholder={httpBodyContentPlaceHolder}
        onChange={() => {
          setBodyError(undefined);
          setResponseError(undefined);
        }}
      />

      <Form.TextArea
        id="httpResponse"
        error={useResponseError}
        title="Http Request Response"
        value={isEmptyObject(useResponse) ? "" : JSON.stringify(useResponse)}
        placeholder="Do not input anything here."
        onChange={() => {
          setResponse("");
        }}
      />
    </Form>
  );
}
