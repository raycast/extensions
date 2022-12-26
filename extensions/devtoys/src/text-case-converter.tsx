import { Form, ActionPanel, Action } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  camelCase,
  constantCase,
  headerCase,
  lowerCase,
  paramCase,
  pascalCase,
  sentenceCase,
  snakeCase,
  titleCase,
  upperCase,
} from "text-case";

enum ConverterId {
  sentenceCase = "sentenceCase",
  lowerCase = "lowerCase",
  upperCase = "upperCase",
  titleCase = "titleCase",
  camelCase = "camelCase",
  pascalCase = "pascalCase",
  snakeCase = "snakeCase",
  kebabCase = "kebabCase",
  constantCase = "constantCase",
  cobolCase = "cobolCase",
  trainCase = "trainCase",
}

type Converter = {
  id: ConverterId;
  title: string;
  enable: boolean;
  execute: (text: string) => string;
};

type Values = {
  [key in ConverterId]?: string;
};

const defaultConverters: Converter[] = [
  {
    id: ConverterId.sentenceCase,
    title: "Sentence case",
    enable: false,
    execute: sentenceCase,
  },
  {
    id: ConverterId.lowerCase,
    title: "lower case",
    enable: false,
    execute: lowerCase,
  },
  {
    id: ConverterId.upperCase,
    title: "UPPER CASE",
    enable: false,
    execute: upperCase,
  },
  {
    id: ConverterId.titleCase,
    title: "Title Case",
    enable: true,
    execute: titleCase,
  },
  {
    id: ConverterId.camelCase,
    title: "camelCase",
    enable: false,
    execute: camelCase,
  },
  {
    id: ConverterId.pascalCase,
    title: "PascalCase",
    enable: false,
    execute: pascalCase,
  },
  {
    id: ConverterId.snakeCase,
    title: "snake_case",
    enable: false,
    execute: snakeCase,
  },
  {
    id: ConverterId.kebabCase,
    title: "kebab-case",
    enable: true,
    execute: paramCase,
  },
  {
    id: ConverterId.constantCase,
    title: "CONSTANT-CASE",
    enable: false,
    execute: constantCase,
  },
  {
    id: ConverterId.cobolCase,
    title: "COBOL-CASE",
    enable: false,
    execute: (text: string) => upperCase(paramCase(text)),
  },
  {
    id: ConverterId.trainCase,
    title: "Train-Case",
    enable: false,
    execute: headerCase,
  },
];

export default function TextCaseConverterCommand() {
  const [converters, setConverters] = useState<Converter[]>(defaultConverters);
  const [originalText, setOriginalText] = useState("");
  const [values, setValues] = useState<Values>({});
  const enableConverters = converters.filter((converter) => converter.enable);

  const updateConverters = useCallback((enabledConverterIds: string[]) => {
    const converters = defaultConverters.map((converter) => ({
      ...converter,
      enable: enabledConverterIds.includes(converter.id),
    }));

    setConverters(converters);
  }, []);

  useEffect(() => {
    const values: Values = {};

    converters.forEach(({ id, execute }) => {
      values[id] = execute(originalText);
    });

    setValues(values);
  }, [originalText]);

  return (
    <Form
      actions={
        <ActionPanel>
          {enableConverters.map(({ id, title }) => (
            <Action.CopyToClipboard
              key={`copy-${id}`}
              content={values[id] ?? ""}
              title={`Copy ${title} to Clipboard`}
            />
          ))}
        </ActionPanel>
      }
    >
      <Form.TextField id="originalText" title="Original Text" value={originalText} onChange={setOriginalText} />

      {enableConverters.map(({ id, title }) => (
        <Form.TextField key={`converter-${id}`} id={id} title={title} value={values[id] ?? ""} onChange={() => null} />
      ))}

      <Form.Separator />

      <Form.TagPicker
        id="enabled-converters"
        title="Enabled Converters"
        value={converters.filter(({ enable }) => enable).map(({ id }) => id)}
        onChange={updateConverters}
      >
        {converters.map(({ id, title }) => (
          <Form.TagPicker.Item key={`enabled-converters-${id}`} value={id} title={title} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
