import { Toast, showToast, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Response } from "./utils/types";
import { addDomain } from "./utils/api";
import { DOMAIN_REGEX } from "./utils/constants";

export default async function AddDomain(props: LaunchProps<{ arguments: Arguments.AddDomain }>) {
  const { domainName } = props.arguments;

  if (!DOMAIN_REGEX.test(domainName)) {
    await showFailureToast("The domain is invalid", { title: "ERROR" });
  } else {
    const response: Response = await addDomain(domainName);
    if (response.type === "success") {
      await showToast(Toast.Style.Success, "Domain Added", "Domain added successfully to your Purelymail account.");
    }
  }
}
