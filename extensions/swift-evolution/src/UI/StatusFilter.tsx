import { List } from "@raycast/api";
import { Status } from "../Domain/ProposalDataModel";

export default function StatusFilter(props: { onChange: (selected: string) => void }) {
  const allStatuses = Object.values(Status);
  const withAllStatuses = ["All", ...allStatuses];
  const onChange = props.onChange;
  return (
    <List.Dropdown tooltip="Dropdown With Items" onChange={onChange}>
      {withAllStatuses.map((status) => (
        <List.Dropdown.Item key={status} title={status} value={status} />
      ))}
    </List.Dropdown>
  );
}
