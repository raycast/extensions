import { Form } from "@raycast/api";
import { InputJSON } from "./utils/inputJSONView";
import { SwiftType, Types } from "./utils/types";
import { convertSwift } from "./json2Swift/swiftConvert";
import { jsonRootName } from "./utils/jsonRootName";
import { useState } from "react";

export default function Command() {
  const [rootName, setRootName] = useState("");

  function swiftTypeForm() {
    return (
      <Form.Dropdown id="option" title="Type" storeValue>
        <Form.Dropdown.Item value={SwiftType.Struct} title="Struct" />
        <Form.Dropdown.Item value={SwiftType.Class} title="Class" />
      </Form.Dropdown>
    );
  }

  function swiftRootName() {
    return <Form.TextField id="name" value={rootName} title="Root Name" onChange={(value) => setRootName(value)} />;
  }

  return (
    <InputJSON
      navTitle="JSON to Swift"
      actionTitle="Generate"
      type={Types.Swift}
      onConvert={async (values) => await convertSwift(values.jsonValue, values.option as SwiftType, values.name)}
      extraNode={[swiftTypeForm(), swiftRootName()]}
      onChange={(value) => {
        setRootName(jsonRootName(value));
      }}
    />
  );
}
