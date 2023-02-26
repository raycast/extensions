import { List } from "@raycast/api";
import { getAssetFromProduct } from "../helpers/getAssetFromProduct";
import { getFormattedDate } from "../helpers/getFormattedDate";
import { getKeywordsFromProduct } from "../helpers/getKeywordsFromProduct";
import { ProtonProduct, Version } from "../interface";

interface Props {
  data?: Version;
  product: ProtonProduct;
}

const ProtonVersionList = ({ data, product }: Props) => {
  return (
    <List.Item
      title={`${data?.version}` ?? "Error while loading data"}
      icon={{ source: getAssetFromProduct(product) }}
      subtitle={`Deployed ${getFormattedDate(data?.date)} UTC`}
      keywords={getKeywordsFromProduct(product)}
    />
  );
};

export default ProtonVersionList;
