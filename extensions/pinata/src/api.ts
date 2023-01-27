import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import axios from "axios";

interface Preferences {
  PINATA_JWT: string;
  SUBMARINE_KEY: string;
  GATEWAY: string;
}

interface Response {
  count: number;
  rows: RowsItem[];
}
interface RowsItem {
  id: string;
  cid: string;
  ipfs_pin_hash: string;
  size: number;
  user_id: string;
  date_pinned: string;
  date_unpinned: null;
  metadata: Metadata;
  regions: any[];
}

interface Metadata {
  name: string;
}

const preferences = getPreferenceValues<Preferences>();
const JWT = `Bearer ${preferences.PINATA_JWT}`;

export function getPinned() {
  return useFetch<Response>("https://api.pinata.cloud/data/pinList?includesCount=false&status=pinned&pageLimit=100", {
    headers: {
      Authorization: JWT,
    },
  });
}

export function deleteFileByHash(hash) {
  return axios.delete(`https://api.pinata.cloud/pinning/unpin/${hash}`, {
    headers: {
      Authorization: JWT,
    },
  });
}
