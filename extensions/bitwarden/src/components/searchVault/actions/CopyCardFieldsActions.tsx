import CopyObjectStringFieldsActions from "~/components/searchVault/actions/CopyObjectFieldsActions";
import { cardBitwardenPageFieldOrderSorter } from "~/utils/cards";

function CopyCardFieldsActions() {
  return <CopyObjectStringFieldsActions selector={(item) => item.card} sorter={cardBitwardenPageFieldOrderSorter} />;
}

export default CopyCardFieldsActions;
