import { List } from "@raycast/api";
import { messaging } from "../../messaging";

const EmptyState = () => <List.EmptyView title={messaging.RESULTS_PLACEHOLDER} />;

export { EmptyState };
