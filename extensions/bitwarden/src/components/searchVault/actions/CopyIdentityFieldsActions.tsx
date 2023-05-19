import CopyObjectStringFieldsActions from "~/components/searchVault/actions/shared/CopyObjectFieldsActions";
import { IDENTITY_KEY_LABEL } from "~/constants/labels";
import { Identity } from "~/types/vault";
import { identityFormOrderSorter } from "~/utils/identity";

function CopyIdentityFieldsActions() {
  return (
    <CopyObjectStringFieldsActions<Identity>
      selector={(item) => item.identity}
      sorter={identityFormOrderSorter}
      labelMapper={(field) => IDENTITY_KEY_LABEL[field]}
    />
  );
}

export default CopyIdentityFieldsActions;
