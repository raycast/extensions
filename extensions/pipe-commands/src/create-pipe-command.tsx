import {
  ActionPanel,
  environment,
  Form,
  popToRoot,
  showInFinder,
  showToast,
  Action,
  Toast,
  getPreferenceValues,
  List,
} from "@raycast/api";
import { writeFileSync } from "fs";
import { resolve } from "path/posix";
import untildify from "untildify";

const languageToProperties: Record<
  string,
  {
    extension: string;
    shebang: string;
    commentSign: string;
    helloWorld: string;
  }
> = {
  Bash: { extension: ".sh", commentSign: "#", shebang: "#!/bin/bash", helloWorld: "echo 'Hello World!'" },
  Python: {
    extension: ".py",
    commentSign: "#",
    shebang: "#!/usr/bin/env python3",
    helloWorld: "print('Hello World!')",
  },
  Javascript: {
    extension: ".js",
    commentSign: "//",
    shebang: "#!/usr/bin/env node",
    helloWorld: "console.log('Hello World!');",
  },
  Ruby: { extension: ".rb", commentSign: "#", shebang: "#!/usr/bin/env ruby", helloWorld: "puts 'Hello World!'" },
  Swift: { extension: ".swift", commentSign: "//", shebang: "#!/usr/bin/swift", helloWorld: "print('Hello World!')" },
  PHP: {
    extension: ".php",
    commentSign: "//",
    shebang: "#!/usr/bin/env php",
    helloWorld: "<?php echo 'Hello World!' ?>",
  },
};

interface FormValues {
  template: string;
  title: string;
  mode: string;
  packageName?: string;
  percentEncoded: boolean;
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
    const { pipeCommandsFolder = environment.supportPath } = getPreferenceValues<{ pipeCommandsFolder: string }>();
    const filepath = resolve(untildify(pipeCommandsFolder), `${title}${languageProperties.extension}`);

    const metadataLines = [
      `${languageProperties.commentSign} @raycast.title ${values.title}`,
      `${languageProperties.commentSign} @raycast.mode ${values.mode}`,
      `${languageProperties.commentSign} @raycast.icon ➡️`,
      `${
        languageProperties.commentSign
      } @raycast.argument1 {"type": "text", "percentEncoded": ${!!values.percentEncoded}}`,
    ];

    if (values.packageName) {
      metadataLines.push(`${languageProperties.commentSign} @raycast.packageName ${values.packageName}`);
    }

    const help = `${languageProperties.commentSign} Documentation: https://github.com/raycast/extensions/blob/main/extensions/pipe-commands/README.md`;
    const content = [languageProperties.shebang, "", help, ...metadataLines, "", languageProperties.helloWorld].join(
      "\n"
    );

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
        {[
          ["Silent", "silent"],
          ["Replace", "fullOutput"],
          ["Compact", "compact"],
          ["Replace", "replace"],
          ["Copy", "copy"],
        ].map(([title, value]) => (
          <List.Dropdown.Item key={value} title={title} value={value} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Title" placeholder="Command Title" id="title" />
      <Form.TextField title="Package Name" placeholder="E. g., Developer Utils" id="packageName" />
      <Form.Checkbox
        defaultValue={false}
        title="Percent Encoded"
        id="percentEncoded"
        label="Perform percent encoding on the input value."
      />
    </Form>
  );
}
