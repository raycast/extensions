import * as React from "react";
import * as Types from "@ui/types";
import { List } from "@raycast/api";
import { glpiIconTicketStatus } from "@ui/components/icons/glpi";

const BUILTIN_FILTERS: Types.Filter[] = [
  {
    name: "New",
    icon: glpiIconTicketStatus[1],
    query: "status.id==1",
  },
  {
    name: "Processing",
    icon: glpiIconTicketStatus[2],
    query: "status.id=in=(2,3)",
  },
  {
    name: "Not Solved",
    icon: glpiIconTicketStatus[4],
    query: "status.id=le=4",
  },
  {
    name: "Closed + Solved",
    icon: glpiIconTicketStatus[6],
    query: "status.id=ge=5",
  },
  {
    name: "Approval",
    icon: glpiIconTicketStatus[10],
    query: "status.id==10",
  },
];

type Props = {
  setFilter: React.Dispatch<React.SetStateAction<string>>;
};

export default function SearchBarAccessory({ setFilter }: Props): React.ReactElement {
  const filters = BUILTIN_FILTERS;

  const onChange = (value: string) => {
    setFilter(value);
  };

  return (
    <List.Dropdown tooltip="Filters" storeValue={true} onChange={onChange}>
      {filters.map((v, i) => (
        <List.Dropdown.Item title={v.name} icon={v.icon} value={v.query} key={i} />
      ))}
    </List.Dropdown>
  );
}
