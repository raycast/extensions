import { LaunchProps, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { generateAddressName, generateRandomAddressName } from "./util/address-name";
import { Tokens } from "./util/tokens";
import { addToPortfolio } from "./util/portfolio";
import { isValidEthereumAddress } from "./util/validation";

type AddEthAddressArguments = {
  address: string;
  name?: string;
};

export default async function Command(props: LaunchProps<{ arguments: AddEthAddressArguments }>) {
  const { address, name } = props.arguments;

  if (!isValidEthereumAddress(address)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Ethereum Address",
      message: "Please enter a valid Ethereum address",
    });
    return;
  }

  const addressName = name
    ? generateAddressName(Tokens.ETH, address, name)
    : generateRandomAddressName(Tokens.ETH, address);

  try {
    await addToPortfolio({
      address,
      name: addressName,
      token: Tokens.ETH,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Ethereum Address Added",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to Add Ethereum Address" });
  }
}
