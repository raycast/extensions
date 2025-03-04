import { Toast, popToRoot, showToast, LaunchProps } from "@raycast/api";

import fetch from "node-fetch";
import { API_HEADERS, API_URL, DOMAIN_REGEX } from "./constants";
import { showFailureToast } from "@raycast/utils";
import { Domain } from "./types";
import { parseImprovMXResponse } from "./utils";

export default async function AddDomain(props: LaunchProps<{ arguments: Arguments.AddDomain }>) {
  const propDomain = props.arguments.domain;
  const isValid = DOMAIN_REGEX.test(propDomain);

  try {
    await showToast(Toast.Style.Animated, "Adding Domain");
    if (!isValid) throw new Error("Invalid Domain");

    const response = await fetch(API_URL + "domains", {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({
        domain: propDomain,
      }),
    });
    // @ts-expect-error Response type is incompatible
    const result = await parseImprovMXResponse<{ domain: Domain }>(response, { pagination: false });

    await showToast(
      Toast.Style.Success,
      `${result.data.domain.display} Added`,
      "Domain added successfully to your ImprovMX account.",
    );
    popToRoot({ clearSearchBar: true });
  } catch (error) {
    await showFailureToast(error, { title: "ImprovMX Error" });
    return;
  }
}
