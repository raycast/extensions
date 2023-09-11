import { Toast, showToast, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import axios from "axios";

interface Preferences {
  PINATA_JWT: string;
  SUBMARINE_KEY: string;
  GATEWAY: string;
}

export interface PinnedResponse {
  count: number;
  rows: RowsItem[];
}

export interface SubmarinedPinnedResponse {
  status: number;
  totalItems: number;
  items: SubmarineItem[];
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

interface SubmarineItem {
  id: string;
  createdAt: string;
  cid: string;
  name: string;
  mimeType: string;
  originalName: string;
  size: number;
  metadata: Metadata;
  pinToIPFS: boolean;
  isDuplicate: boolean;
}

interface Metadata {
  name: string;
}

const preferences = getPreferenceValues<Preferences>();
const JWT = `Bearer ${preferences.PINATA_JWT}`;
const SUBMARINE_KEY = preferences.SUBMARINE_KEY;
const GATEWAY = preferences.GATEWAY;

export function getPinned() {
  return useFetch<PinnedResponse>(
    "https://api.pinata.cloud/data/pinList?includesCount=false&status=pinned&pageLimit=100",
    {
      headers: {
        Authorization: JWT,
      },
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch`,
          message: `Check and make sure the API key is valid`,
          primaryAction: {
            title: "Change  Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
      },
    }
  );
}

export function getSubmarinedPinned() {
  return useFetch<SubmarinedPinnedResponse>("https://managed.mypinata.cloud/api/v1/content?status=pinned&limit=100", {
    headers: {
      "x-api-key": `${SUBMARINE_KEY}`,
    },
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to fetch`,
        message: `Check and make sure the API key is valid`,
        primaryAction: {
          title: "Change  Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
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
export function deleteSubmarineFileByHash(id) {
  return axios.delete(`https://managed.mypinata.cloud/api/v1/content/${id}`, {
    headers: {
      "x-api-key": `${SUBMARINE_KEY}`,
    },
  });
}
