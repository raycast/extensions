import { LaunchProps } from "@raycast/api";

import { openGoogleAiMode } from "./google-ai-mode";

type Arguments = {
  query?: string;
};

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const query = props.arguments.query?.trim();

  await openGoogleAiMode(query);
}
