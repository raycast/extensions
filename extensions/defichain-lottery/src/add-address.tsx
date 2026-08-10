import { showToast, Toast } from "@raycast/api";
import { addAddress } from "./service/addresses";

interface Address {
  address: string;
}

export default async (props: { arguments: Address }) => {
  const address = props.arguments.address;

  if (address.length != 34 && address.length != 42) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Address seems to be not a valid DFI address!",
      message: "(" + address + ")",
    });
    return;
  }

  return addAddress(address);
};
