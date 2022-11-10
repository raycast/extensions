import { Icon, Alert, LocalStorage, confirmAlert, showToast, Toast } from "@raycast/api";

const KEY_ADDRESS_STORAGE = "items";

export async function loadAddresses() {
  const addressesString = (await LocalStorage.getItem<string>(KEY_ADDRESS_STORAGE)) || "[]";
  return JSON.parse(addressesString.toString());
}

export async function addAddress(address: string) {
  const addresses = await loadAddresses();
  if (addresses.includes(address)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Address is already in the watchlist!",
      message: "(" + address + ")",
    });
    return;
  }
  addresses.push(address);
  await LocalStorage.setItem(KEY_ADDRESS_STORAGE, JSON.stringify(addresses));
  await showToast({
    style: Toast.Style.Success,
    title: "DFI address added",
    message: "(" + address + ")",
  });
}

export async function removeAddress(address: string): Promise<string[]> {
  const removeAddressPromise = () => {
    return new Promise((resolve, reject) => {
      loadAddresses().then((addresses) => {
        if (!addresses.includes(address)) {
          reject();
        }
        addresses = addresses.filter((addressItem: string) => addressItem !== address);
        LocalStorage.setItem(KEY_ADDRESS_STORAGE, JSON.stringify(addresses)).then(() => {
          resolve(addresses);
        });
      });
    });
  };

  const options: Alert.Options = {
    title: "Are you sure?",
    message: "Do you want to remove this address from the watchlist",
    icon: Icon.Trash,
    primaryAction: {
      title: "Remove it",
      style: Alert.ActionStyle.Destructive,
      onAction: () => {
        showToast({
          style: Toast.Style.Success,
          title: "Removed address from watchlist",
        });
      },
    },
  };

  return new Promise((resolve, reject) => {
    confirmAlert(options).then((clickedPrimary: boolean) => {
      if (clickedPrimary) {
        removeAddressPromise()
          .then((addresses: any) => {
            resolve(addresses);
          })
          .catch(() => reject());
      } else {
        reject();
      }
    });
  });
}
