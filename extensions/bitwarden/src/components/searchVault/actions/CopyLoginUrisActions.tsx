import { Item } from "~/types/vault";
import CopyObjectStringFieldsActions from "~/components/searchVault/actions/CopyObjectFieldsActions";

function CopyLoginUrisActions() {
  const getUriMap = (item: Item): RecordOfStrings => {
    return Object.fromEntries(
      item.login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`URI ${index + 1}`, uri.uri]) || []
    );
  };

  return <CopyObjectStringFieldsActions selector={getUriMap} />;
}

export default CopyLoginUrisActions;
