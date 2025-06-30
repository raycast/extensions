import { List } from "@raycast/api";
import { useLDFlagDetail } from "../hooks/useLDFlagDetail";
import { useEnvironmentOrder } from "../hooks/useEnvironmentOrder";
import FlagDetailsHeader from "./FlagDetailsHeader";
import EnvironmentsList from "./EnvironmentsList";
import { LDFlag } from "../types";

interface FlagDetailsProps {
  flag: LDFlag;
}

export default function FlagDetails({ flag }: FlagDetailsProps) {
  const { data, isLoading, error } = useLDFlagDetail(flag.key);
  const detailedFlag = data || flag;
  const envKeys = Object.keys(detailedFlag.environments || {});
  const { environmentOrder, moveEnvironment } = useEnvironmentOrder(envKeys);

  return (
    <List navigationTitle={flag.name || flag.key} isShowingDetail isLoading={isLoading}>
      <List.Section title="General">
        <FlagDetailsHeader flag={detailedFlag} environmentOrder={environmentOrder} />
      </List.Section>

      {detailedFlag.environments && (
        <EnvironmentsList flag={detailedFlag} environmentOrder={environmentOrder} onMoveEnvironment={moveEnvironment} />
      )}

      {error && <List.EmptyView title="Error Loading Flag" description={error.message} />}
    </List>
  );
}
