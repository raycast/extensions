import { useStorage } from "./hooks/storage";
import { Requests } from "./types/request";
import { StorageKey } from "./types/storage";
import { CreateRequest } from "./views/CreateRequest";

export default function Command() {
  const { value: requests, setValue: setRequests } = useStorage<Requests>({
    key: StorageKey.REQUESTS,
    initialValue: {},
  });

  return <CreateRequest requests={requests} setRequests={setRequests} autoSend />;
}
