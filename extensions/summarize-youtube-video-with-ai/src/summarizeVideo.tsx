import { Detail } from "@raycast/api";

const markdown = `
# The Extension has changed

We introduced new commands to summarize YouTube videos with AI. The one you used to use is now deprecated and split into three. You can choose one of the following commands:

- Summarize with Raycast: \`summarizeVideoWithRaycastAI\`
- Summarize with OpenAI: \`summarizeVideoWithOpenAI\`
- Summarize with Anthropic: \`summarizeVideoWithAnthropic\`

You have to migrate your settings to the new commands. Open the extensions preferences and update the command accordingly. You can find your old settings in the deprecated command.

If you only use one command you can also disbale the others in the preferences.
`;

export default function DeprecationNote() {
  return <Detail markdown={markdown} navigationTitle="The Extension has changed" />;
}
