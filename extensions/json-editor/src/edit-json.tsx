import { useEffect, useState } from "react";

import { Form, ActionPanel, Action, Icon, Color } from "@raycast/api";

import jsonToYaml from "./utils/json-to-yaml";
import jsonToGo from "./utils/json-to-go";
import jsonToTs from "./utils/json-to-ts";
import useJsonTsOptions from "./hooks/useJsonTsOptions";

const ErrorInvalidJSON = "Invalid JSON";
const ErrorIvalidFilterExpression = "Invalid filter expression";

export default function Command() {
  const [text, setText] = useState("");
  const [pattern, setPattern] = useState("");
  const [result, setResult] = useState("");
  const [jsonObj, setJsonObj] = useState({});
  const jsonTsOptions = useJsonTsOptions();

  useEffect(() => {
    const [result, object] = filterJSONByPattern(text.trim(), pattern);
    setResult(result);
    setJsonObj(object);
  }, [text, pattern]);

  return (
    <Form
      actions={
        text &&
        jsonObj && (
          <ActionPanel>
            <Action.CopyToClipboard content={result} title="Copy Result" />
            <Action.CopyToClipboard content={JSON.stringify(jsonObj)} title="Copy Minified Result" />
            <Action.CopyToClipboard content={escapeJsonText(jsonObj)} title="Escape Result" />
            <Action.CopyToClipboard content={jsonToYaml(jsonObj)} title="Convert Result to YAML" />
            <Action.CopyToClipboard
              content={jsonToTs(result, jsonTsOptions)}
              title="Convert Result to Typescript Definition"
            />
            <Action.CopyToClipboard content={jsonToGo(result)} title="Convert Result to Go Type Definition" />
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Sponsor Project"
                icon={{ source: Icon.Heart, tintColor: Color.Red }}
                url="https://ko-fi.com/herbertlu"
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Paste JSON here..." value={text} onChange={setText} />
      <Form.TextField
        id="pattern"
        title="Filter"
        placeholder='JS filter; e.g. ".key.subkey", "[0][1]", ".map(x=>x.val)"'
        value={pattern}
        onChange={setPattern}
      />
      <Form.Separator />
      <Form.TextArea id="output" title="Result" value={result} onChange={setResult} />
    </Form>
  );
}

function filterJSONByPattern(input: string, pattern: string) {
  let obj = undefined;

  if (input.trim() == "") {
    return ["", undefined];
  }

  try {
    obj = JSON.parse(input);
  } catch (err) {
    try {
      // try unescaping input
      const unescapedInput = '"'.concat(input).concat('"');
      const objText = JSON.parse(unescapedInput);
      obj = JSON.parse(objText);
    } catch (e) {
      return [ErrorInvalidJSON, undefined];
    }
  }

  if (pattern) {
    const expr = `
        if  (obj${pattern} == null || obj${pattern} === null || obj${pattern} === 'undefined' || (typeof obj${pattern} === 'function')){
            obj = undefined
        } else {
          obj = obj${pattern}
        }
        `;
    try {
      eval(expr);
    } catch (err) {
      return [ErrorIvalidFilterExpression, undefined];
    }
  }

  if (obj == undefined) {
    return [ErrorIvalidFilterExpression, undefined];
  }

  const ret = JSON.stringify(obj, null, 2);
  return [ret, obj];
}

function escapeJsonText(input: object) {
  const minifiedjson = JSON.stringify(input);
  return JSON.stringify(minifiedjson).slice(1, -1);
}
