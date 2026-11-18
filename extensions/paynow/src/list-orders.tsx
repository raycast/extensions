import OrderList from "./components/orders/order-list";
import { withProviders } from "./hocs/with-providers";
import { withStores } from "./hocs/with-stores";

const ListOrdersCommand = () => {
  return <OrderList />;
};

export default withProviders(withStores(ListOrdersCommand));
