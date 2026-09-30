import { Toast, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

export default withNoViewErrorHandler(async () => {
  showToast({ title: "IVPN Disconnecting...", style: Toast.Style.Animated });
  await IVPN.disconnect();
  showToast({ title: "IVPN Disconnected", style: Toast.Style.Failure });
});
