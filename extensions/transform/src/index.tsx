import { Action, ActionPanel, Clipboard, closeMainWindow, Form, showHUD } from "@raycast/api";
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
  const copyOutput = async () => {
    await showHUD("Copied to Clipboard");
    await Clipboard.copy(output);
    await closeMainWindow();
  };
  const activePair = transformationPairs.find((pair) => pair.to === to && pair.from === from);

  useEffect(() => {
    if (activePair) {
      (async () => {
        try {
          setOutput(await activePair.transform(input, options));
        } catch (err) {
          setOutput("Invalid input");
        }
      })();
    }
  }, [input, from, to, activePair, options]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy output" onSubmit={copyOutput} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" value={input} onChange={setInput} autoFocus />
      <Form.Dropdown id="from" title="From" value={from} onChange={setFrom} storeValue>
        {fromNames.map((name) => (
          <Form.Dropdown.Item value={name} title={name} key={name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
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
