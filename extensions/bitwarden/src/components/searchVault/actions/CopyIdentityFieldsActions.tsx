import CopyObjectStringFieldsActions from "~/components/searchVault/actions/CopyObjectFieldsActions";
import { identityFormOrderSorter } from "~/utils/identity";

function CopyIdentityFieldsActions() {
  return <CopyObjectStringFieldsActions selector={(item) => item.identity} sorter={identityFormOrderSorter} />;
}

export default CopyIdentityFieldsActions;
