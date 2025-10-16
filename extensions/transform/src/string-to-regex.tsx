import { Form } from "@raycast/api";
import { condense } from "strings-to-regex";
import { useState } from "react";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

enum SplitBy {
  NewLine = "\n",
  Comma = ",",
  Space = " ",
}

export default () => {
  const [splitBy, setSplitBy] = useState(SplitBy.Space);
  const formProps = useForm({
    transformDeps: [splitBy],
    transform: (value: string) => {
      return `/${condense(value.split(splitBy)).source}/`;
    },
  });

  return (
    <DefaultForm
      {...formProps}
      options={
        <Form.Dropdown id="splitBy" title="Split by" onChange={(newValue) => setSplitBy(newValue as SplitBy)}>
          <Form.Dropdown.Item value={SplitBy.Space} title="Space" />
          <Form.Dropdown.Item value={SplitBy.Comma} title="Comma" />
          <Form.Dropdown.Item value={SplitBy.NewLine} title="Newline" />
        </Form.Dropdown>
      }
    />
  );
};
