import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { EditableHeaders, ReadOnlyHeaders } from "../components/Header";
import { EditableQueryParameters, QueryParameter, ReadonlyQueryParameters } from "../components/QueryParameters";
import { useDelegateState } from "../hooks/controllable";
import { useEditableHeaders } from "../hooks/headers";
import { Header } from "../types/headers";
import { Request, RequestMethod, RequestMethodType, Requests } from "../types/request";
import { getUrlDetails, getRequestHelpers } from "../utils/request";
import { ResponseView } from "./Response";

export type CreateOrEditRequestProps = {
  requests: Requests;
  setRequests: React.Dispatch<React.SetStateAction<Requests>>;
  request?: Request;
  autoSend?: boolean;
};

export function CreateOrEditRequest(props: Readonly<CreateOrEditRequestProps>) {
  const { requests, setRequests, request, autoSend = false } = props;
  const [, setInternalRequests] = useDelegateState({ value: requests, onChange: setRequests });
  const [internalRequest, setInternalRequest] = useDelegateState<Request | undefined>({
    value: request,
    onChange: (value) => {
      if (value === undefined) {
        return;
      }

      setInternalRequests((previous) => {
        const updatedRequests = { ...previous };
        updatedRequests[value.id] = value;

        return updatedRequests;
      });
    },
  });

  const navigation = useNavigation();

  // region URL

  const [url, setUrl] = useState<string | null>(internalRequest?.url?.toString?.() ?? null);
  const parsedUrl = useMemo(() => {
    if (url == null || url === "") {
      return undefined;
    }

    try {
      return new URL(url);
    } catch (error) {
      return undefined;
    }
  }, [url]);
  const [urlError, setUrlError] = useState<string | undefined>();

  function validateUrl(value: string | null) {
    if (value == null || value === "") {
      return "URL is required";
    }

    try {
      const parsedValue = new URL(value);
      if (!["http:", "https:"].includes(parsedValue.protocol)) {
        return "URL must be http or https";
      }
    } catch (error) {
      return "URL is invalid";
    }

    return undefined;
  }

  useEffect(() => {
    setUrlError(validateUrl(url));
  }, [url]);

  // endregion

  // region Method

  const [method, setMethod] = useState<RequestMethodType>(internalRequest?.details?.method ?? RequestMethod.GET);
  const [methodError, setMethodError] = useState<string | undefined>();

  useEffect(() => {
    if (!Object.values(RequestMethod).includes(method)) {
      setMethodError("Method is invalid");
    } else if (methodError !== undefined) {
      setMethodError(undefined);
    }
  }, [method]);

  // endregion

  // region Body

  const [body, setBody] = useState<string>(internalRequest?.details?.body ? internalRequest.details.body : "");

  // endregion

  // region Query Parameters

  const [areQueryParametersReadonly, setAreQueryParametersReadonly] = useState<boolean>(true);

  const queryParameters: QueryParameter[] = useMemo(() => {
    if (parsedUrl === undefined) {
      return [];
    }

    const searchParams = Object.fromEntries(parsedUrl.searchParams.entries());
    return Object.entries(searchParams).reduce((accumulator, [key, value]) => {
      accumulator.push({
        key,
        value,
      });

      return accumulator;
    }, [] as QueryParameter[]);
  }, [url]);

  const setQueryParameters: React.Dispatch<React.SetStateAction<QueryParameter[]>> = useCallback(
    (next: React.SetStateAction<QueryParameter[]>) => {
      if (parsedUrl === undefined) {
        return;
      }

      function filterEmpty({ key, value }: QueryParameter) {
        return !(key === "" || value === "");
      }

      const filteredQueryParameters = queryParameters.filter(filterEmpty);
      const nextValue = (typeof next === "function" ? next(filteredQueryParameters) : next).filter(filterEmpty);

      if (
        (nextValue.length === 0 && filteredQueryParameters.length === 0) ||
        JSON.stringify(nextValue) === JSON.stringify(filteredQueryParameters)
      ) {
        return;
      }

      const newUrl = new URL(parsedUrl);
      Array.from(newUrl.searchParams.keys()).forEach((key) => {
        newUrl.searchParams.delete(key);
      });

      nextValue.forEach(({ key, value }) => {
        newUrl.searchParams.append(key, value);
      });

      setUrl(newUrl.toString());
    },
    [parsedUrl, queryParameters, setUrl],
  );

  // endregion

  // region Headers

  const [headers, setHeaders] = useState<Record<string, Header>>(
    internalRequest?.details?.headers
      ? Object.entries(internalRequest.details.headers).reduce(
          (accumulator, [key, value]) => ({
            ...accumulator,
            [uuidv4()]: {
              key,
              value,
            },
          }),
          {} as Record<string, Header>,
        )
      : {},
  );
  const [areHeadersReadonly, setAreHeadersReadonly] = useState<boolean>(Object.keys(headers).length > 0);

  const { isHeadersEmpty, setHeaderKey, setHeaderValue, removeHeader, addHeaderAction, removeHeaderAction } =
    useEditableHeaders({
      headers,
      setHeaders,
    });

  // endregion

  // region Auto-Send Request

  useEffect(() => {
    if (internalRequest === undefined || !autoSend) {
      return;
    }

    const { sendRequest } = getRequestHelpers({
      requestId: internalRequest.id,
      requests: {
        ...requests,
        [internalRequest.id]: internalRequest,
      },
      setRequests,
    });

    showToast({
      style: Toast.Style.Animated,
      title: "Sending Request",
      message: "Request is being sent",
    }).then((toast) => {
      sendRequest({
        toast,
        rethrow: false,
      }).then((response) => {
        if (internalRequest === undefined || response === undefined || Object.keys(response).length === 0) {
          return;
        }

        navigation.push(<ResponseView request={internalRequest} response={response} />);
      });
    });
  }, [internalRequest]);

  // endregion

  function createRequest(): Request | undefined {
    if (parsedUrl === undefined) {
      setUrlError("URL is invalid");
      return undefined;
    }

    if (internalRequest !== undefined) {
      return undefined;
    }

    const id = uuidv4();
    const newRequest: Request = {
      id,
      favorite: false,

      url: parsedUrl,
      details: getUrlDetails(method, parsedUrl, headers, body),

      responses: [],

      created: new Date(),
    };

    setInternalRequests((previous) => ({
      ...previous,
      [newRequest.id]: newRequest,
    }));

    return newRequest;
  }

  function updateRequest(): Request | undefined {
    if (parsedUrl === undefined) {
      setUrlError("URL is invalid");
      return undefined;
    }

    if (internalRequest === undefined) {
      return undefined;
    }

    const updatedRequest = {
      ...requests[internalRequest.id],

      url: parsedUrl,
      details: getUrlDetails(method, parsedUrl, headers, body),

      responses: [],
    };
    setInternalRequests((previous) => {
      const updatedRequests = { ...previous };
      updatedRequests[internalRequest.id] = updatedRequest;

      return updatedRequests;
    });

    return updatedRequest;
  }

  const onSubmit = () => {
    if (parsedUrl === undefined) {
      setUrlError("URL is invalid");
      return;
    }

    try {
      let newRequest: Request | undefined;
      if (internalRequest !== undefined) {
        newRequest = updateRequest();
      } else {
        newRequest = createRequest();
      }

      showToast({
        style: Toast.Style.Success,
        title: "Request created",
        message: "Request has been created successfully",
      }).then(() => {
        setInternalRequest(newRequest);

        if (!autoSend) {
          navigation.pop();
        }
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create request",
        message: (error as Error).message,
      }).then();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${internalRequest !== undefined ? "Save" : "Create"} Request`}
            onSubmit={onSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <ActionPanel.Section title="Query Parameters">
            <Action
              title="Add Query Parameter"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
              onAction={() => {
                setQueryParameters((previous) => [...previous, { key: "", value: "" }]);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Headers">
            {addHeaderAction}
            {!isHeadersEmpty && removeHeaderAction}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url-text-field"
        title="url"
        placeholder="https://api.exmaple.com"
        value={url ?? ""}
        onChange={setUrl}
        error={urlError}
      />
      <Form.Dropdown
        id="method-dropdown"
        title="Method"
        value={method}
        onChange={(newValue) => {
          if (!Object.values(RequestMethod).includes(newValue as RequestMethodType)) {
            return;
          }

          setMethod(newValue as RequestMethodType);
        }}
        error={methodError}
      >
        {Object.entries(RequestMethod).map(([key, value]) => (
          <Form.Dropdown.Item key={`method-option-${key}`} value={value} title={key} />
        ))}
      </Form.Dropdown>

      {/* @ts-expect-error The method of the request can be something more than the "setting" methods */}
      {[RequestMethod.PUT, RequestMethod.POST].includes(method) && (
        <Form.TextArea id="body-text-area" title="Body" placeholder="Body" value={body} onChange={setBody} />
      )}

      <Form.Separator />

      <Form.Description title="Query Parameters" text="Press ⌘J to Add; Press ⌘⇧J to Remove" />
      <Form.Checkbox
        id="are-query-parameters-editable-toggle"
        label="Edit Query Parameters"
        value={!areQueryParametersReadonly}
        onChange={(newValue) => setAreQueryParametersReadonly(!newValue)}
      />
      {areQueryParametersReadonly ? (
        <ReadonlyQueryParameters queryParameters={queryParameters} />
      ) : (
        <EditableQueryParameters queryParameters={queryParameters} setQueryParameters={setQueryParameters} />
      )}
      <Form.Separator />

      <Form.Description title="Headers" text={`Press ⌘H to Add${!isHeadersEmpty ? "; Press ⌘⇧H to Remove" : ""}`} />
      <Form.Checkbox
        id="are-headers-editable-toggle"
        label="Edit Headers"
        value={!areHeadersReadonly}
        onChange={(newValue) => setAreHeadersReadonly(!newValue)}
      />
      {areHeadersReadonly ? (
        <ReadOnlyHeaders headers={headers} />
      ) : (
        <EditableHeaders
          headers={headers}
          setHeaderKey={setHeaderKey}
          setHeaderValue={setHeaderValue}
          removeHeader={removeHeader}
        />
      )}
    </Form>
  );
}
