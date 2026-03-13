import { List } from "@raycast/api";
import { Cache } from "../api/caches";
import { Database } from "../api/databases";
import { Domain } from "../api/domains";
import { Network } from "../api/networks";
import { Project } from "../api/projects";
import ResultActions from "./ResultActions";
import ResultDetails from "./ResultDetails";

export interface Props {
  id: string | number;
  title: string;
  type: "cache" | "database" | "domain" | "network" | "project";
  result: Cache | Database | Domain | Network | Project;
}

export default function ResultItem(props: Props) {
  return (
    <List.Item
      key={props.id}
      title={props.title}
      icon={{ value: "list-icon.png", tooltip: "List Icon" }}
      actions={<ResultActions {...props} />}
      detail={<ResultDetails {...props} />}
    />
  );
}
