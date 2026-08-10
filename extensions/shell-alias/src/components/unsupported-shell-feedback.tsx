import { Detail } from "@raycast/api";

const markdown = `
# Unsupported shell

It looks like you are using a shell that is not supported by this extension for now.
`;

export default function UnsupportedShellFeedback() {
  return <Detail markdown={markdown} />;
}
