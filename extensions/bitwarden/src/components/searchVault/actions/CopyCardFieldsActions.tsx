import CopyObjectStringFieldsActions from "~/components/searchVault/actions/shared/CopyObjectFieldsActions";
import { CARD_KEY_LABEL } from "~/constants/labels";
import { cardBitwardenPageFieldOrderSorter } from "~/utils/cards";

function CopyCardFieldsActions() {
  return (
    <CopyObjectStringFieldsActions
      selector={(item) => item.card}
      sorter={cardBitwardenPageFieldOrderSorter}
      labelMapper={(field) => CARD_KEY_LABEL[field]}
    />
  );
}

export default CopyCardFieldsActions;
