import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { EditableHeaders, ReadOnlyHeaders } from "../components/header";
import { EditableQueryParameters, QueryParameter, ReadonlyQueryParameters } from "../components/queryParameters";
import { useDelegateState } from "../hooks/controllable";
import { Header, useEditableHeaders } from "../hooks/headers";
import { Rebound, ReboundRequestMethod, ReboundRequestMethodType, Rebounds } from "../types/rebound";
import { getUrlDetails } from "../utils/rebound";

export type CreateOrEditReboundProps = {
  rebounds: Rebounds;
  setRebounds: React.Dispatch<React.SetStateAction<Rebounds>>;
  rebound?: Rebound;
};

export function CreateOrEditRebound(props: Readonly<CreateOrEditReboundProps>) {
  const { rebounds, setRebounds, rebound } = props;
  const [, setInternalRebounds] = useDelegateState({ value: rebounds, onChange: setRebounds });

  const navigation = useNavigation();

  // region URL

  const [url, setUrl] = useState<string | null>(rebound?.url?.toString?.() ?? null);
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

  const [method, setMethod] = useState<ReboundRequestMethodType>(rebound?.details?.method ?? ReboundRequestMethod.GET);
  const [methodError, setMethodError] = useState<string | undefined>();

  useEffect(() => {
    if (!Object.values(ReboundRequestMethod).includes(method)) {
      setMethodError("Method is invalid");
    } else if (methodError !== undefined) {
      setMethodError(undefined);
    }
  }, [method]);

  // endregion

  // region Body

  const [body, setBody] = useState<string>(rebound?.details?.body ? rebound.details.body : "");

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
    rebound?.details?.headers
      ? Object.entries(rebound.details.headers).reduce(
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

  function createRebound() {
    if (parsedUrl === undefined) {
      setUrlError("URL is invalid");
      return;
    }

    if (rebound !== undefined) {
      return;
    }

    setInternalRebounds((previous) => {
      const id = uuidv4();
      const newRebound: Rebound = {
        id,
        favorite: false,

        url: parsedUrl,
        details: getUrlDetails(method, parsedUrl, headers, body),

        responses: [],

        created: new Date(),
      };

      return {
        ...previous,
        [id]: newRebound,
      };
    });
  }

  function updateRebound() {
    if (parsedUrl === undefined) {
      setUrlError("URL is invalid");
      return;
    }

    if (rebound === undefined) {
      return;
    }

    setInternalRebounds((previous) => {
      const updatedRebounds = { ...previous };

      updatedRebounds[rebound.id] = {
        ...rebound,

        url: parsedUrl,
        details: getUrlDetails(method, parsedUrl, headers, body),

        responses: [],
      };

      return updatedRebounds;
    });
  }

  const onSubmit = () => {
    if (parsedUrl === undefined) {
      setUrlError("URL is invalid");
      return;
    }

    try {
      if (rebound !== undefined) {
        updateRebound();
      } else {
        createRebound();
      }

      showToast({
        style: Toast.Style.Success,
        title: "Rebound created",
        message: "Rebound has been created successfully",
      }).then(() => {
        navigation.pop();
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create rebound",
        message: (error as Error).message,
      }).then();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${rebound !== undefined ? "Save" : "Create"} Rebound`}
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
          if (!Object.values(ReboundRequestMethod).includes(newValue as ReboundRequestMethodType)) {
            return;
          }

          setMethod(newValue as ReboundRequestMethodType);
        }}
        error={methodError}
      >
        {Object.entries(ReboundRequestMethod).map(([key, value]) => (
          <Form.Dropdown.Item key={`method-option-${key}`} value={value} title={key} />
        ))}
      </Form.Dropdown>

      {/* @ts-expect-error The method of the request can be something more than the "setting" methods */}
      {[ReboundRequestMethod.PUT, ReboundRequestMethod.POST].includes(method) && (
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
