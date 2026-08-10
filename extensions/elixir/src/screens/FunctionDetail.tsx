import type { Generic } from "../types";
import React from "react";
import { Action, ActionPanel, Detail } from "@raycast/api";

const DetailActions = ({
  module,
  func,
}: {
  module: string;
  func: Generic;
}): JSX.Element => {
  const functionCall = `${module}.${func.name.replace(/\/.*/g, "()")}`;

  return (
    <ActionPanel title="Panel Title">
      <Action.CopyToClipboard
        title="Copy Function Call"
        content={functionCall}
      />
      <Action.Paste title="Paste Function Call" content={functionCall} />
      <Action.OpenInBrowser
        url={`https://hexdocs.pm/elixir/${module}.html#${func.name}`}
      />
    </ActionPanel>
  );
};

export function FunctionDetail({
  module,
  func,
}: {
  module: string;
  func: Generic;
}) {
  let specsSection = "";

  if (func.specs.length > 0) {
    const formattedSpecs = func.specs.map(
      (spec) => `\`\`\`elixir\n${spec}\n\`\`\``,
    );
    specsSection = `## Specs\n\n${formattedSpecs.join("\n\n")}`;
  }

  // The `.replace` call bellow is necessary as some callbacks have underscores in their names
  // like `Kernel.SpecialForms.__CALLER__/0` and if we don't escape those characters, they won't be
  // properly displayed in the markdown.
  const markdown = `
  # ${module}.${func.name.replace(/_/g, "\\_")}

  ${specsSection}

  ## Documentation

  ${func.documentation ? func.documentation : "_No documentation available._"}
  `;

  return (
    <Detail
      navigationTitle={`${module}.${func.name}`}
      markdown={markdown}
      actions={<DetailActions module={module} func={func} />}
    />
  );
}
