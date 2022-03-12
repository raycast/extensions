import { ActionPanel, environment, Form, popToRoot, showInFinder, showToast, Action, Toast } from "@raycast/api";
import { writeFileSync } from "fs";
import { resolve } from "path/posix";
import { ArgumentType, argumentTypes, scriptModes } from "./types";

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
  Python: { extension: ".py", comments: "#", shebang: "#!/usr/bin/env python3", helloWorld: "print('Hello World!')" },
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
  mode: string;
  packageName?: string;
  percentEncoded: boolean;
  type: ArgumentType;
}

export default function PipeCommandForm(): JSX.Element {
  function onSubmit(values: FormValues) {
    console.debug(values);
    if (!values.title) {
      showToast(Toast.Style.Failure, "Title is required!");
      return;
    }
    const languageProperties = languageToProperties[values.template];
    const title = values.title.trim().toLowerCase().replace(/\s+/g, "-");
    const filepath = resolve(environment.supportPath, `${title}${languageProperties.extension}`);

    const metadataLines = [
      `${languageProperties.comments} @raycast.title ${values.title}`,
      `${languageProperties.comments} @raycast.mode ${values.mode}`,
      `${languageProperties.comments} @raycast.argument1 {"type": "${
        values.type
      }", "percentEncoded": ${!!values.percentEncoded}}`,
    ];

    if (values.packageName) {
      metadataLines.push(`${languageProperties.comments} @raycast.packageName ${values.packageName}`);
    }

    const content = [languageProperties.shebang, "", ...metadataLines, "", languageProperties.helloWorld].join("\n");

    writeFileSync(filepath, content, { mode: 0o755 });
    showInFinder(filepath);
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Template" id="template">
        {Object.keys(languageToProperties).map((language) => (
          <Form.Dropdown.Item key={language} title={language} value={language} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Mode" id="mode">
        {scriptModes.map((mode) => (
          <Form.Dropdown.Item key={mode} title={mode} value={mode} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Title" placeholder="Command Title" id="title" />
      <Form.TextField title="Package Name" placeholder="E. g., Developer Utils" id="packageName" />
      <Form.Dropdown title="Accept" id="type">
        {argumentTypes.map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        defaultValue={false}
        title="Percent Encoded"
        id="percentEncoded"
        label="Perform percent encoding on the input value."
      />
    </Form>
  );
}
