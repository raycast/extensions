import { useEffect, useState } from "react";
import { setLocalStorageItem, getLocalStorageItem, removeLocalStorageItem } from "@raycast/api";

const KEY = "FAVORITE_ADDRESSES";

export type Address = {
  address: string;
  identifier: string;
};

async function loadFavoriteAddresses() {
  const item = await getLocalStorageItem<string>(KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as Address[];
  } else {
    return [];
  }
}

async function saveFavoriteAddresses(addresses: Address[]) {
  const data = JSON.stringify(addresses);
  await setLocalStorageItem(KEY, data);
}

export async function clearFavoriteAddresses() {
  return await removeLocalStorageItem(KEY);
}

export default function useFavoriteAddresses() {
  const [favoriteAddresses, setFavoriteAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavoriteAddresses()
      .then(setFavoriteAddresses)
      .then(() => setLoading(false));
  }, []);

  const addFavoriteAddress = async (address: string, identifier = "") => {
    const addresses = [
      ...favoriteAddresses,
      {
        address,
        identifier,
      },
    ];

    setFavoriteAddresses(addresses);
    saveFavoriteAddresses(addresses);
  };

  const removeFavoriteAddress = async (address: string) => {
    const addresses = favoriteAddresses.filter((c) => c.address !== address);

    saveFavoriteAddresses(addresses);
    setFavoriteAddresses(addresses);
  };

  return {
    favoriteAddresses,
    addFavoriteAddress,
    removeFavoriteAddress,
    loading,
  };
}
