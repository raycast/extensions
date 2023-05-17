import CopyObjectStringFieldsActions from "~/components/searchVault/actions/shared/CopyObjectFieldsActions";
import { CARD_KEY_LABEL } from "~/constants/labels";
import { Card } from "~/types/vault";
import { cardBitwardenPageFieldOrderSorter } from "~/utils/cards";

function CopyCardFieldsActions() {
  return (
    <CopyObjectStringFieldsActions
      selector={(item) => item.card}
      sorter={cardBitwardenPageFieldOrderSorter}
      labelMapper={(field) => CARD_KEY_LABEL[field as keyof Card]}
    />
  );
}

export default CopyCardFieldsActions;
