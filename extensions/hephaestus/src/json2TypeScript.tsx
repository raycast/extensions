import { useState } from "react";
import { convertTypeScript } from "./json2TypeScript/typeScriptConvert";
import { InputJSON } from "./utils/inputJSONView";
import { Types } from "./utils/types";
import { Form } from "@raycast/api";
import { jsonRootName } from "./utils/jsonRootName";

export default function Command() {
  const [rootName, setRootName] = useState("");

  function typeScriptRootName() {
    return <Form.TextField id="name" value={rootName} title="Root Name" onChange={(value) => setRootName(value)} />;
  }

  return (
    <InputJSON
      navTitle="JSON to TypeScript"
      actionTitle="Generate"
      type={Types.TypeScript}
      onConvert={async (value) => await convertTypeScript(value.jsonValue, value.name)}
      extraNode={[typeScriptRootName()]}
      onChange={(value) => {
        setRootName(jsonRootName(value));
      }}
    />
  );
}
