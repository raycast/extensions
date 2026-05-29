import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

export default function Command() {
  const { data, isLoading } = usePromise(getDelphitoolsInstallStatus);

  if (isLoading || !data) {
    return <Detail isLoading markdown="# Checking delphitools" />;
  }

  return <DelphitoolsInstallStatusView status={data} />;
}
