import axios from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { DobbyVault } from "../models/vault";

export const getVaults = async () => {
  const baseUrl = "https://api.defichain-dobby.com/";
  const { dobbyApiKey } = getPreferenceValues<{ dobbyApiKey?: string }>();
  const vaults: DobbyVault[] = [];

  return axios
    .get(baseUrl + "user", {
      headers: {
        "content-type": "text/json",
        "x-user-auth": dobbyApiKey as string,
      },
    })
    .then((response) => {
      response.data.vaults.forEach((vault) => {
        vaults.push({
          vaultId: vault.vaultId,
          name: vault.name,
          ownerAddress: vault.ownerAddress,
          loanScheme: vault.loanScheme.minCollateral,
          state: vault.state,
          collateralValue: vault.collateralValue,
          loanValue: vault.loanValue,
          collateralRatio: vault.collateralRatio,
          nextCollateralRatio: vault.nextCollateralRatio,
        });
      });
      return vaults;
    })
    .catch((error) => {
      if (error.response.status == 401) {
        showToast({
          style: Toast.Style.Failure,
          title: "Not authorized",
          message: "Your Dobby key is not valid",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Ocean API not available",
          message: "please try again later...",
        });
      }
    });
};
