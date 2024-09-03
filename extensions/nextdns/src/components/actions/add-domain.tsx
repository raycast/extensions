import { Action, Icon } from "@raycast/api";
import { addDomain } from "../../libs/api";
import { AddDomainActionProps } from "../../types";

const AddDomainAction: React.FC<AddDomainActionProps> = ({ domain, type }) => (
  <Action
    key={domain}
    title={`Add *.${domain}`}
    icon={type == "allow" ? Icon.CheckCircle : Icon.CircleDisabled}
    onAction={() => addDomain({ domain, type })}
  />
);

export default AddDomainAction;
