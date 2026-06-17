import { useEffect, useState } from "react";
import { Form, LaunchProps } from "@raycast/api";
import InstanceForm from "./components/InstanceForm";
import useInstances from "./hooks/useInstances";
import { Instance } from "./types";
import { getURL } from "./utils/browserScripts";
import { isServiceNowUrl } from "./utils/instanceUrl";

function deriveInstanceName(hostname: string): string {
  const match = hostname.match(/^([^.]+)\.service-now\.com$/i);
  return match ? match[1] : hostname;
}

export default function addInstanceProfile(props: LaunchProps<{ draftValues: Instance }>) {
  const { draftValues } = props;
  const { addInstance, instances, isLoading } = useInstances();
  const [initialName, setInitialName] = useState<string | undefined>(undefined);
  const [detectionDone, setDetectionDone] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await getURL();
        if (cancelled) return;
        if (url && isServiceNowUrl(url, instances)) {
          const hostname = new URL(url).hostname.toLowerCase();
          setInitialName(deriveInstanceName(hostname));
        }
      } catch {
        // ignore detection errors
      }
      if (!cancelled) setDetectionDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  if (isLoading || !detectionDone) {
    return <Form isLoading navigationTitle="Manage Instance Profiles - Add" />;
  }

  return <InstanceForm onSubmit={addInstance} instance={draftValues} initialName={initialName} />;
}
