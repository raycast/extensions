import {List} from "@raycast/api";
import {useAPM} from "./useAPM";


// noinspection JSUnusedGlobalSymbols
export default function CommandListDashboards() {
  const {apm, apmIsLoading} = useAPM();

  return <List isLoading={apmIsLoading}>
    {apm.map(([name, calls]) =>
      <List.Item
        key={name}
        title={name}
        subtitle={calls.calls.length > 0 ? `Calls ${calls.calls.join(", ")}` : undefined}
      />
    )}
  </List>;
}
