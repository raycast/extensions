import {
  ActionPanel,
  environment,
  Form,
  List,
  popToRoot,
  showInFinder,
  showToast,
  SubmitFormAction,
  ToastStyle,
} from "@raycast/api";
import { writeFileSync } from "fs";
import { resolve } from "path/posix";
import { ArgumentType } from "./types";

const languageToProperties: Record<
  string,
  {
    extension: string;
    shebang: string;
    comments: string;
    helloWorld: string;
  }
> = {
  Bash: { extension: ".sh", comments: "#", shebang: "#!/bin/bash", helloWorld: "echo 'Hello World!'" },
  Python: { extension: ".py", comments: "#", shebang: "#!/usr/bin/env python", helloWorld: "print('Hello World!')" },
  Javascript: {
    extension: ".js",
    comments: "//",
    shebang: "#!/usr/bin/env node",
    helloWorld: "console.log('Hello World!');",
  },
  Ruby: { extension: ".rb", comments: "#", shebang: "#!/usr/bin/env ruby", helloWorld: "puts 'Hello World!'" },
  Swift: { extension: ".swift", comments: "//", shebang: "#!/usr/bin/swift", helloWorld: "print('Hello World!')" },
  PHP: { extension: ".php", comments: "//", shebang: "#!/usr/bin/env php", helloWorld: "<?php echo 'Hello World!' ?>" },
};

interface FormValues {
  template: string;
  title: string;
  description: string;
  packageName: string;
  percentEncoded: boolean;
  type: ArgumentType;
}

export default function PipeCommandForm(): JSX.Element {
  function onSubmit(values: FormValues) {
    console.debug(values);
    if (!values.title) {
      showToast(ToastStyle.Failure, "Title is required!");
      return;
    }
    const languageProperties = languageToProperties[values.template];
    const filename = `${values.title.trim().toLowerCase().replace(/\s+/, "-")}${languageProperties.extension}`;
    const filepath = resolve(environment.supportPath, filename);

    const metadataLines = [
      `${languageProperties.comments} @raycast.title ${values.title}`,
      `${languageProperties.comments} @raycast.mode silent`,
      `${languageProperties.comments} @raycast.argument1 {"type": "${
        values.type
      }", "placeholder": "selection", "percentEncoded": ${!!values.percentEncoded}}`,
    ];
    if (values.description)
      metadataLines.push(`${languageProperties.comments} @raycast.description ${values.description}`);
    if (values.packageName)
      metadataLines.push(`${languageProperties.comments} @raycast.packageName ${values.packageName}`);

    const content = [languageProperties.shebang, "", ...metadataLines, "", languageProperties.helloWorld].join("\n");

    writeFileSync(filepath, content);
    showInFinder(filepath);
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Template" id="template">
        {Object.keys(languageToProperties).map((language) => (
          <Form.Dropdown.Item key={language} title={language} value={language} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Title" placeholder="Command Title" id="title" />
      <Form.TextArea title="Description" id="description" placeholder="Descriptive Summary" />
      <Form.TextField title="Package Name" id="packageName" placeholder="E.g., Developer Utils" />
      <List.Section />
      <Form.Dropdown title="Accept" id="type">
        {["text", "file", "url"].map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        defaultValue={false}
        title="Percent Encoded"
        id="percentEncoded"
        label="Perform percent encoding on the argument value."
      />
    </Form>
  );
}
