import { Action } from "@raycast/api";
import { State } from "../../haapi";
import { ZoneList } from "./list";

export function ZoneShowDetailAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("zone")) {
    return null;
  }
  return <Action.Push title="Show Zone" target={<ZoneList state={s} />} />;
}
