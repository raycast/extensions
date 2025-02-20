import { Form } from "@raycast/api";
import { Fragment, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useControllableState } from "../hooks/controllable";
import { UseEditableHeaders, UseEditableHeadersOptions } from "../hooks/headers";
import { HEADER_KEYS } from "../utils/headers";
import { FormDropdownWithCustom } from "./DropdownWithCustom";

export type EditableHeaderProps = {
  headerKey: string;
  setKey: (key: string) => void;
  value: string;
  setValue: (value: string) => void;
};

export function EditableHeader(props: Readonly<EditableHeaderProps>) {
  const { headerKey, setKey, value, setValue } = props;

  const id = useMemo(() => uuidv4().toString(), []);

  const [internalKey, setInternalKey] = useControllableState({
    value: headerKey,
    onChange: setKey,
    defaultValue: "",
  });

  const [internalValue, setInternalValue] = useControllableState({
    value,
    onChange: setValue,
    defaultValue: "",
  });

  return (
    <>
      <FormDropdownWithCustom
        id={`header-key-${id}`}
        key={`header-key-${id}`}
        title="Header Key"
        value={internalKey}
        onChange={setInternalKey}
        isCustomFirst
      >
        {HEADER_KEYS.map((header) => (
          <Form.Dropdown.Item key={`predefined-header-option-${header}`} title={header} value={header} />
        ))}
      </FormDropdownWithCustom>
      <Form.TextField
        id={`header-value-${id}`}
        key={`header-value-${id}`}
        title="Header Value"
        value={internalValue}
        placeholder="Value"
        onChange={setInternalValue}
      />
    </>
  );
}

export type EditableHeadersProps = {
  headers: UseEditableHeadersOptions["headers"];
  setHeaderKey: UseEditableHeaders["setHeaderKey"];
  setHeaderValue: UseEditableHeaders["setHeaderValue"];
  removeHeader: UseEditableHeaders["removeHeader"];
};

export function EditableHeaders(props: Readonly<EditableHeadersProps>) {
  const { headers, setHeaderKey, setHeaderValue, removeHeader } = props;

  return (
    <>
      {Object.entries(headers).map(([id, header], index) => (
        <Fragment key={`header-${id}`}>
          <Form.Separator key={`header-separator-${id}`} />
          <Form.Description key={`header-section-title-${id}`} text={`Header #${index + 1}`} />

          <EditableHeader
            key={`editable-header-${id}`}
            headerKey={header.key}
            setKey={(key) => setHeaderKey(id, key)}
            value={header.value}
            setValue={(value) => setHeaderValue(id, value)}
          />
          <Form.Checkbox
            key={`remove-header-${id}`}
            id={`remove-header-${id}`}
            label="Remove Header"
            value={false}
            onChange={(newValue) => {
              if (newValue) {
                removeHeader(id);
              }
            }}
          />
        </Fragment>
      ))}
    </>
  );
}

export type ReadOnlyHeadersProps = {
  headers: UseEditableHeadersOptions["headers"];
};

export function ReadOnlyHeaders(props: Readonly<ReadOnlyHeadersProps>) {
  const { headers } = props;

  if (Object.keys(headers).length === 0) {
    return null;
  }

  return (
    <Form.TagPicker id="readonly-headers" title="headers" value={Object.keys(headers)} onChange={() => {}}>
      {Object.entries(headers).map(([id, { key, value }]) => (
        <Form.TagPicker.Item key={`readonly-headers-header-tag-${id}`} title={`${key}:${value}`} value={id} />
      ))}
    </Form.TagPicker>
  );
}
