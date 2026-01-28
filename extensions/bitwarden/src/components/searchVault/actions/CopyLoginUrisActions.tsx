import { Item } from "~/types/vault";
import CopyObjectStringFieldsActions from "~/components/searchVault/actions/shared/CopyObjectFieldsActions";

function CopyLoginUrisActions() {
  const getUriMap = (item: Item) => {
    return (
      item.login?.uris?.reduce<RecordOfStrings>((result, uri, index) => {
        if (!uri.uri) return result;
        result[`URI ${index + 1}`] = uri.uri;
        return result;
      }, {}) ?? {}
    );
  };

  return <CopyObjectStringFieldsActions selector={getUriMap} />;
}

export default CopyLoginUrisActions;
