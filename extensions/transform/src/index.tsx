import { Action, ActionPanel, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import * as transformers from "./transformers";
import { unique } from "./lib/utils";

const transformationPairs = Object.values(transformers) as {
  from: string;
  to: string;
  transform: (value: string, options: Record<string, string>) => string;
  Options?: (props: OptionsComponentProps) => JSX.Element;
}[];

export default function Command() {
  const [options, setOptions] = useState({} as Record<string, string>);
  const [input, setInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [output, setOutput] = useState("");
  const possibleTransformations = transformationPairs.filter((pair) => pair.from === from);
  const fromNames = unique(transformationPairs.map((pair) => pair.from));
  const toNames = unique(possibleTransformations.map((pair) => pair.to));
  const activePair = transformationPairs.find((pair) => pair.to === to && pair.from === from);

  useEffect(() => {
    if (!activePair) return;
    (async () => {
      try {
        setOutput(await activePair.transform(input, options));
      } catch (err) {
        setOutput("Invalid input");
      }
    })();
  }, [input, from, to, activePair, options]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" value={input} onChange={setInput} autoFocus />
      <Form.Dropdown id="from" title="From" value={from} onChange={setFrom} storeValue>
        {fromNames.map((name) => (
          <Form.Dropdown.Item value={name} title={name} key={name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="to" title="To" value={to} onChange={setTo} storeValue>
        {toNames.map((name) => (
          <Form.Dropdown.Item value={name} title={name} key={name} />
        ))}
      </Form.Dropdown>
      {activePair?.Options && <activePair.Options setOptions={setOptions} />}
      <Form.TextArea id="output" title="Output" value={output} />
    </Form>
  );
}
