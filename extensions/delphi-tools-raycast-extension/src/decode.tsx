import type { LaunchProps } from "@raycast/api";

import { TextCodecCommand } from "./text-codec-command";

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Decode }>,
) {
  return (
    <TextCodecCommand
      operation="decode"
      initialInput={props.arguments.text}
      initialEncoding={getInitialEncoding(props.arguments.encoding)}
    />
  );
}

function getInitialEncoding(encoding: string | undefined) {
  return encoding === "url" ? "url" : "base64";
}
