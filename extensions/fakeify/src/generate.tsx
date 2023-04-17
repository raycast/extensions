import { Form, ActionPanel, Action, popToRoot, useNavigation, List, Icon, Color } from "@raycast/api";
import * as raycast from "@raycast/api";
import { useRef, useState } from "react";
import { FieldType, Fields } from "./types";
import { DATES, FORMATS_SELECT } from "./formats";
import { getData } from "./controller";

const ERROR_MESSAGE = "This field is required";
export default function Generate() {
  const hasLengthParam = ["id", "stringId", "paragraphs"];
  const [state, setState] = useState<FieldType>({
    name: "",
    type: "",
    format: "",
    maxLength: undefined,
    nbrOfP: undefined,
  });
  const [fields, setFields] = useState<Fields>([]);
  const inputRef = useRef<any>();
  const [formError, setFormError] = useState<boolean>(false);
  const { push } = useNavigation();

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: FieldType) => {
              if (values?.name === "") {
                setFormError(true);
                return;
              }

              setFields([...fields, values]);
              setState({
                name: "",
                type: "",
                format: "",
                maxLength: undefined,
                nbrOfP: undefined,
              });
              inputRef?.current?.focus();
              //   popToRoot();
            }}
          />
          <Action title="Show fields" onAction={() => push(<DisplayFields fields={fields} setFields={setFields} />)} />
          <Action
            title="Generate data"
            onAction={() => push(<ExportScreen fields={fields} setFields={setFields} />)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        autoFocus
        ref={inputRef}
        id="name"
        title="Name"
        value={state?.name}
        error={formError ? ERROR_MESSAGE : ""}
        onChange={(e) => {
          setFormError(false);
          setState({ ...state, name: e });
        }}
      />
      <Form.Dropdown id="type" title="Type" defaultValue="id" onChange={(e) => setState({ ...state, type: e })}>
        <Form.Dropdown.Item value="id" title="id - int" />
        <Form.Dropdown.Item value="stringId" title="id - string" />
        <Form.Dropdown.Item value="firstname" title="Firstname" />
        <Form.Dropdown.Item value="lastname" title="Lastname" />
        <Form.Dropdown.Item value="name" title="Firstname - Lastname" />
        <Form.Dropdown.Item value="phone" title="Phone number" />
        <Form.Dropdown.Item value="email" title="Email" />
        <Form.Dropdown.Item value="paragraph" title="Paragraph" />
        <Form.Dropdown.Item value="paragraphs" title="Paragraphs" />
        <Form.Dropdown.Item value="date" title="Date" />
        <Form.Dropdown.Item value="fullAddress" title="Full address" />
        <Form.Dropdown.Item value="postcode" title="Postcode" />
        <Form.Dropdown.Item value="street" title="Street n° & name" />
        <Form.Dropdown.Item value="country" title="Country" />
      </Form.Dropdown>
      {hasLengthParam.includes(state?.type as string) && <Form.TextField id="maxLength" title="Max length" />}
      {state?.type && state?.type in FORMATS_SELECT && (
        <Form.Dropdown id="format" title="Format" defaultValue="" onChange={(e) => setState({ ...state, format: e })}>
          {FORMATS_SELECT[state?.type as string]?.map((format: { value: string; label: string }) => (
            <Form.Dropdown.Item key={`format-${format?.value}`} value={format?.value} title={format?.label} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

export const DisplayFields = ({ fields, setFields }: { fields: Fields; setFields: (fields: Fields) => void }) => {
  const [newFields, setNewFields] = useState<Fields>(fields);
  return (
    <List>
      {newFields?.map((field: FieldType, index: number) => (
        <List.Item
          key={`field-${index}`}
          title={field?.name as string}
          actions={
            <ActionPanel>
              <Action
                title="Delete"
                onAction={() => {
                  const tmpFields = newFields?.filter((item) => item.name !== field?.name);
                  setNewFields(tmpFields);
                  setFields(tmpFields);
                }}
              />
            </ActionPanel>
          }
          accessories={[
            { text: "Type : " },

            {
              tag: { value: field?.type, color: Color.PrimaryText },
              tooltip: "Type",
            },

            { text: "Format : " },

            {
              tag: {
                value: `${DATES[field?.format as string] ?? field?.format !== undefined ? field?.format : ""}`,
                color: Color.PrimaryText,
              },
              tooltip: "Format",
            },
            { text: "Max length : " },

            {
              tag: { value: String(field?.maxLength ?? ""), color: Color.PrimaryText },
              tooltip: "Max Length",
            },
            { icon: Icon.XMarkCircle },
          ]}
        />
      ))}
    </List>
  );
};

export const ExportScreen = ({ fields, setFields }: { fields: Fields; setFields: (fields: Fields) => void }) => {
  const [formError, setFormError] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<{ format: string; number: string }>({
    format: "json",
    number: "10",
  });
  const { push } = useNavigation();

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy to clipboard"
            onSubmit={(value: { exportFormat: string }) => {
              if (exportFormat?.number === "") {
                setFormError(true);
                return;
              }
              const data = getData({
                body: {
                  fieldNbr: exportFormat?.number,
                  extension: exportFormat?.format,
                  data: fields?.map((d: any) => ({
                    name: d?.name,
                    type: d?.type,
                    format: d?.format,
                    maxLength: d?.maxLength,
                    nbrOfP: d?.nbrOfP,
                  })),
                },
              });
              raycast.Clipboard.copy(JSON.stringify(data));
              popToRoot();
            }}
          />
          <Action title="Show fields" onAction={() => push(<DisplayFields fields={fields} setFields={setFields} />)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="number"
        title="Number of rows"
        error={formError ? ERROR_MESSAGE : ""}
        value={exportFormat?.number}
        onChange={(e) => setExportFormat({ ...exportFormat, number: e })}
      />
    </Form>
  );
};
