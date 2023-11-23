import CopyObjectStringFieldsActions from "~/components/searchVault/actions/shared/CopyObjectFieldsActions";
import { Item } from "~/types/vault";

function CopyCustomFieldsActions() {
  const getFieldMap = (item: Item): RecordOfStrings => {
    return Object.fromEntries(item.fields?.map((field) => [field.name, field.value]) || []);
  };

  return <CopyObjectStringFieldsActions selector={getFieldMap} />;
}

export default CopyCustomFieldsActions;
