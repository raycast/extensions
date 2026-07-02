import { LaunchProps } from "@raycast/api";
import { useState } from "react";
import getBase from "./base";
import { ToolMenu } from "./views/tool-menu";
import { ToolDefinition } from "./tools";
import { InputToolPicker } from "./views/input-tool-picker";

function ExecutionCommand({ props }: { props: LaunchProps }) {
  return getBase(props, "translate");
}

function shouldOpenExecutionView(props: LaunchProps) {
  const context = props.launchContext ?? {};
  if (context["inputPicker"]) {
    return false;
  }

  return Boolean(
    props.fallbackText ||
      context["mode"] ||
      context["txt"] ||
      context["img"] ||
      context["autoStart"] ||
      context["loadSelected"] ||
      context["loadClipboard"],
  );
}

function shouldOpenInputPicker(props: LaunchProps) {
  const context = props.launchContext ?? {};
  return Boolean(context["inputPicker"] && context["txt"]);
}

export default function Command(props: LaunchProps) {
  const [executionContext, setExecutionContext] = useState<Record<string, unknown> | undefined>();

  if (shouldOpenExecutionView(props)) {
    return <ExecutionCommand props={props} />;
  }

  if (executionContext) {
    return <ExecutionCommand props={{ ...props, launchContext: executionContext }} />;
  }

  if (shouldOpenInputPicker(props)) {
    const context = props.launchContext ?? {};
    return (
      <InputToolPicker
        sourceTitle={(context["sourceTitle"] as string | undefined) ?? "Choose Tool"}
        inputText={(context["txt"] as string | undefined) ?? ""}
        ocrImage={context["img"] as string | undefined}
        onSelectTool={setExecutionContext}
      />
    );
  }

  return (
    <ToolMenu onOpenCurrentCommandTool={(tool: ToolDefinition) => setExecutionContext(tool.launch.context ?? {})} />
  );
}
