import ProductList from "./components/products/product-list";
import { withProviders } from "./hocs/with-providers";
import { withStores } from "./hocs/with-stores";

const ListProductsCommand = () => {
  return <ProductList />;
};

export default withProviders(withStores(ListProductsCommand));
