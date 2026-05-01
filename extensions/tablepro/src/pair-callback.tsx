import { LaunchProps, LaunchType, launchCommand, showHUD } from "@raycast/api";

interface LaunchContext {
  code?: string;
}

export default async function PairCallback(
  props: LaunchProps<{ launchContext?: LaunchContext }>,
) {
  const code = props.launchContext?.code;
  if (!code) {
    await showHUD("Pairing callback missing code");
    return;
  }
  await launchCommand({
    name: "pair",
    type: LaunchType.UserInitiated,
    context: { code },
  });
}
