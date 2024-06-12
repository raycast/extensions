import { List } from "@raycast/api";
import { messaging } from "../../messaging";

const LoadingState = () => <List.EmptyView title={messaging.RESULTS_LOADING} />;

export { LoadingState };
