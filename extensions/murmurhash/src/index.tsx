import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import murmurHash3 from "murmurhash3js";

const enum Algo {
  X86_32 = "x86-32",
  X86_128 = "x86-128",
  X64_128 = "x64-128",
}

const hashFunctions = {
  [Algo.X86_32]: murmurHash3.x86.hash32,
  [Algo.X86_128]: murmurHash3.x86.hash128,
  [Algo.X64_128]: murmurHash3.x64.hash128,
};

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [algo, setAlgo] = useState<string>(Algo.X86_32);
  const [seed, setSeed] = useState<string>("");

  const hash = hashFunctions[algo as Algo](input, +seed).toString();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={hash} title="Copy Hash to Clipboard" />
          <Action.Paste content={hash} title="Paste Hash in Active App" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Enter text to hash..." onChange={setInput} />
      <Form.Dropdown id="type" title="Algorithm" defaultValue={Algo.X86_32} onChange={setAlgo}>
        <Form.Dropdown.Item value={Algo.X86_32} title="MurmurHash3, x86, 32 bit" />
        <Form.Dropdown.Item value={Algo.X86_128} title="MurmurHash3, x86, 128 bit" />
        <Form.Dropdown.Item value={Algo.X64_128} title="MurmurHash3, x64, 128 bit" />
      </Form.Dropdown>
      <Form.TextField
        id="seed"
        title="Seed"
        placeholder="Optional"
        onChange={setSeed}
        error={isNaN(+seed) ? "Must be a number" : undefined}
      />
      <Form.Description title="Hash" text={hash} />
    </Form>
  );
}
