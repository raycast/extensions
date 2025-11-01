import WebhookList from "./components/webhooks/webhook-list";
import { withProviders } from "./hocs/with-providers";
import { withStores } from "./hocs/with-stores";

const ListWebhooksCommand = () => {
  return <WebhookList />;
};

export default withProviders(withStores(ListWebhooksCommand));
