import { List } from "@raycast/api";
import { PRODUCT_ICON, PRODUCT_KEYWORDS, PRODUCT_TITLE } from "../constantsWeb";
import { ProtonProduct, WebEnv, WebVersion } from "../interface";
import Actions from "./WebActionItems";

interface Props {
  data?: WebVersion;
  product: ProtonProduct;
  environment: WebEnv;
}

const ListItem = ({ data, product, environment }: Props) => {
  if (!data) {
    return null;
  }

  const date = new Date(data.date);
  const subTitle = `${data.version} ${environment === "beta" ? "β" : ""}`;

  return (
    <List.Item
      title={PRODUCT_TITLE[product]}
      subtitle={subTitle}
      accessories={[{ date: date, tooltip: `Deployed Date: ${date.toLocaleString()}` }]}
      icon={{ source: PRODUCT_ICON[product] }}
      keywords={PRODUCT_KEYWORDS[product]}
      actions={<Actions data={data} product={product} environment={environment} />}
    />
  );
};

export default ListItem;
