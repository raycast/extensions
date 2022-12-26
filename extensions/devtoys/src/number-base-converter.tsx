import { Form, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";

enum BaseId {
  binary = "binary",
  octal = "octal",
  decimal = "decimal",
  hexadecimal = "hexadecimal",
}

type Base = {
  id: BaseId;
  title: string;
  radix: number;
  groupLength: number;
};

type Values = {
  [key in BaseId]?: string;
};

const bases: Base[] = [
  {
    id: BaseId.hexadecimal,
    title: "Hexadecimal",
    radix: 16,
    groupLength: 2,
  },
  {
    id: BaseId.decimal,
    title: "Decimal",
    radix: 10,
    groupLength: 3,
  },
  {
    id: BaseId.octal,
    title: "Octal",
    radix: 8,
    groupLength: 3,
  },
  {
    id: BaseId.binary,
    title: "Binary",
    radix: 2,
    groupLength: 4,
  },
];

const defaultValues = () => {
  return bases.reduce((obj: Values, { id }) => {
    obj[id] = "";

    return obj;
  }, {});
};

const pretty = (value: string, groupLength: number): string => {
  if (value.length <= 1) {
    return value;
  }

  const output: string[] = [];

  for (let i = value.length; i > 0; i -= groupLength) {
    output.unshift(value.slice(i - groupLength >= 0 ? i - groupLength : 0, i));
  }

  return output.join(" ");
};

export default function NumberBaseConverterCommand() {
  const [activeInput, setActiveInput] = useState<string>("");
  const [activeRadix, setActiveRadix] = useState<number>(10);
  const [isPretty, setIsPretty] = useState<boolean>(true);
  const [values, setValues] = useState<Values>(defaultValues());
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const updateInput = (base: Base, value: string) => {
    if (base.radix === activeRadix) {
      setActiveInput(value);
    }
  };

  const updateBase = ({ id, radix }: Base) => {
    setIsPaused(true);
    setActiveInput(values[id] ?? "");
    setActiveRadix(radix);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isPaused) {
      if (activeInput === "") {
        setValues(defaultValues());
      } else {
        const decimalValue = parseInt(activeInput.replaceAll(" ", ""), activeRadix);
        const values: Values = bases.reduce((obj: Values, { id, radix, groupLength }) => {
          const value = decimalValue.toString(radix);
          obj[id] = isPretty ? pretty(value, groupLength) : value;

          return obj;
        }, {});

        setValues(values);
      }
    }
  }, [activeInput, activeRadix, isPretty]);

  return (
    <Form
      actions={
        <ActionPanel>
          {bases.map(({ id, title }) => (
            <Action.CopyToClipboard key={`copy-${id}`} title={`Copy ${title} Value`} content={values[id] ?? ""} />
          ))}
        </ActionPanel>
      }
    >
      {bases.map((base) => (
        <Form.TextField
          key={`input-${base.id}`}
          id={`input-${base.id}`}
          title={base.title}
          value={values[base.id] ?? ""}
          onChange={(value) => updateInput(base, value)}
          onFocus={() => updateBase(base)}
        />
      ))}

      <Form.Separator />

      <Form.Checkbox
        id={`is-pretty`}
        label="Pretty print"
        info="Format the results for readability"
        value={isPretty}
        onChange={setIsPretty}
      />
    </Form>
  );
}
