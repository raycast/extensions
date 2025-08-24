import { Action, Icon, showToast, Toast } from "@raycast/api";
import { addDomain } from "../../libs/api";
import { AddDomainActionProps } from "../../types";

const AddDomainAction: React.FC<AddDomainActionProps> = ({ domain, type }) => (
  <Action
    key={domain}
    title={`Add *.${domain}`}
    icon={type == "allow" ? Icon.CheckCircle : Icon.CircleDisabled}
    onAction={async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding Domain", message: domain });

      try {
        await addDomain({ domain, type });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not add domain";
      }

      toast.style = Toast.Style.Success;
      toast.title = "Added Domain";
    }}
  />
);

export default AddDomainAction;
