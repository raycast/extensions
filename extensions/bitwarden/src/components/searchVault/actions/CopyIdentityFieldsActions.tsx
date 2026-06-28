import CopyObjectStringFieldsActions from "~/components/searchVault/actions/shared/CopyObjectFieldsActions";
import { IDENTITY_KEY_LABEL } from "~/constants/labels";
import { identityFormOrderSorter } from "~/utils/identity";

function CopyIdentityFieldsActions() {
  return (
    <CopyObjectStringFieldsActions
      selector={(item) => item.identity}
      sorter={identityFormOrderSorter}
      labelMapper={(field) => IDENTITY_KEY_LABEL[field]}
    />
  );
}

export default CopyIdentityFieldsActions;
