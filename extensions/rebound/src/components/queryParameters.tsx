import { Form } from "@raycast/api";
import React, { Fragment, useCallback } from "react";
import { useControllableState } from "../hooks/controllable";

export type QueryParameter = {
  key: string;
  value: string;
};

export type EditableQueryParameterProps = {
  queryParameters?: QueryParameter[];
  setQueryParameters?: React.Dispatch<React.SetStateAction<QueryParameter[]>>;
};

export function EditableQueryParameters(props: Readonly<EditableQueryParameterProps>) {
  const { queryParameters, setQueryParameters } = props;

  const [internalQueryParameters, setInternalQueryParameters] = useControllableState({
    value: queryParameters,
    onChange: setQueryParameters,
    defaultValue: [],
  });

  const getSetters = useCallback(
    (index: number) => ({
      setKey(newKey: string) {
        setInternalQueryParameters((previous) => {
          const newQueryParameters = [...previous];

          newQueryParameters[index] = {
            key: newKey,
            value: newQueryParameters[index].value,
          };

          return newQueryParameters;
        });
      },
      setValue(newValue: string) {
        setInternalQueryParameters((previous) => {
          const newQueryParameters = [...previous];

          newQueryParameters[index] = {
            key: newQueryParameters[index].key,
            value: newValue,
          };

          return newQueryParameters;
        });
      },
    }),
    [setInternalQueryParameters],
  );

  return internalQueryParameters.map(({ key, value }, index) => {
    const { setKey, setValue } = getSetters(index);

    return (
      /* eslint-disable react/no-array-index-key */
      <Fragment key={`query-parameter-${index}`}>
        <Form.Separator />
        <Form.Description text={`Query Parameter #${index + 1}`} />
        <Form.TextField
          id={`search-param-${index}-key`}
          key={`search-param-${index}-key`}
          title="Key"
          value={key}
          onChange={(newValue) => {
            setKey(newValue);
          }}
        />
        <Form.TextField
          id={`search-param-${index}-value`}
          key={`search-param-${index}-value`}
          title="Value"
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
          }}
        />
      </Fragment>
      /* eslint-enable react/no-array-index-key */
    );
  });
}

export type ReadonlyQueryParametersProps = {
  queryParameters: QueryParameter[];
};

export function ReadonlyQueryParameters(props: Readonly<ReadonlyQueryParametersProps>) {
  const { queryParameters } = props;

  if (queryParameters.length === 0) {
    return null;
  }

  return (
    <Form.TagPicker
      id="readonly-query-parameters"
      title="Query Parameters"
      value={Array.from({ length: queryParameters.length }, (_, index) => index.toString())}
      onChange={() => {}}
    >
      {queryParameters.map(({ key, value }, index) => (
        <Form.TagPicker.Item
          // eslint-disable-next-line react/no-array-index-key
          key={`readonly-query-parameter-${index}-${key}`}
          title={`${key}:${value}`}
          value={index.toString()}
        />
      ))}
    </Form.TagPicker>
  );
}
