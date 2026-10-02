import { Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { useLDFlagDetail } from "../hooks/useLDFlagDetail";
import { useEnvironmentOrder } from "../hooks/useEnvironmentOrder";
import { useEnvironments, useFlagStatus, usePrerequisiteFlags } from "../hooks/useLDMetadata";
import FlagDetailsHeader from "./FlagDetailsHeader";
import EnvironmentsList from "./EnvironmentsList";
import { FlagActionContext } from "./FlagActions";
import { LDFlag } from "../types";

interface FlagDetailsProps extends FlagActionContext {
  flagKey: string;
  /** Flag data already loaded by the list; shown until the full detail arrives. */
  initialFlag?: LDFlag;
}

export default function FlagDetails({ flagKey, initialFlag, ...context }: FlagDetailsProps) {
  const { projectKey } = context;
  const { data, isLoading, error } = useLDFlagDetail(projectKey, flagKey);
  const flag = data ?? initialFlag;

  const envKeys = useMemo(() => Object.keys(flag?.environments ?? {}), [flag?.environments]);
  const { environmentOrder, moveEnvironment } = useEnvironmentOrder(envKeys);
  const { environmentsByKey } = useEnvironments(projectKey);
  const { statuses } = useFlagStatus(projectKey, flagKey);

  const prerequisiteKeys = useMemo(
    () => Object.values(flag?.environments ?? {}).flatMap((env) => (env.prerequisites ?? []).map((p) => p.key)),
    [flag?.environments],
  );
  const prerequisiteFlags = usePrerequisiteFlags(projectKey, prerequisiteKeys);

  if (!flag) {
    return (
      <List isLoading={isLoading} navigationTitle={flagKey}>
        {error && <List.EmptyView icon={Icon.Warning} title="Could not load flag" description={error.message} />}
      </List>
    );
  }

  return (
    <List navigationTitle={flag.name || flag.key} isShowingDetail isLoading={isLoading}>
      <List.Section title="General">
        <FlagDetailsHeader flag={flag} environmentOrder={environmentOrder} {...context} />
      </List.Section>

      {flag.environments && (
        <EnvironmentsList
          flag={flag}
          environmentOrder={environmentOrder}
          environmentsByKey={environmentsByKey}
          statuses={statuses}
          prerequisiteFlags={prerequisiteFlags}
          onMoveEnvironment={moveEnvironment}
          {...context}
        />
      )}
    </List>
  );
}
