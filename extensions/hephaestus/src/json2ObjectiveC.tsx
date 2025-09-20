import { Form } from "@raycast/api";
import { InputJSON } from "./utils/inputJSONView";
import { Types } from "./utils/types";
import { convertObjectiveC } from "./json2ObjectiveC/objectiveCConvert";
import { useState } from "react";
import { jsonRootName } from "./utils/jsonRootName";

export default function Command() {
  const [rootName, setRootName] = useState("");

  function objectiveCRootName() {
    return <Form.TextField id="name" value={rootName} title="Root Name" onChange={(value) => setRootName(value)} />;
  }

  function objectiveCPrefix() {
    return <Form.TextField id="prefix" defaultValue="" title="Prefix" />;
  }

  return (
    <InputJSON
      navTitle="JSON to Objective-C"
      actionTitle="Generate"
      type={Types.ObjectiveC}
      onConvert={async (value) => await convertObjectiveC(value.jsonValue, value.prefix, value.name)}
      extraNode={[objectiveCPrefix(), objectiveCRootName()]}
      onChange={(value) => {
        setRootName(jsonRootName(value));
      }}
    />
  );
}
