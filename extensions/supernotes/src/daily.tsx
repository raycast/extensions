import type { LaunchProps } from "@raycast/api";

import { sendToDaily } from "~/utils/senders";

const quickDaily = async (props: LaunchProps<{ arguments: Arguments.Daily }>) => {
  const { content } = props.arguments;
  await sendToDaily(content, true);
};

export default quickDaily;
