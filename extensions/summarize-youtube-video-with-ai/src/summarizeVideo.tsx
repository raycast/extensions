import { Detail } from "@raycast/api";

const markdown = `
# The Extension has changed

We introduced new commands to summarize YouTube videos with AI. The one you are used to is now deprecated and split into three. You can run the following commands:

- Summarize with RaycastAI: \`summarizeVideoWithRaycastAI\`
- Summarize with OpenAI: \`summarizeVideoWithOpenAI\`
- Summarize with Anthropic: \`summarizeVideoWithAnthropic\`

You have to migrate your settings to the new commands. Open the extensions preferences and update the command accordingly. You can find your old settings in the deprecated command.
`;

export default function DeprecationNote() {
  return <Detail markdown={markdown} navigationTitle="The Extension has changed" />;
}
