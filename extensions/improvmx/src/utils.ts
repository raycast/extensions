import { Color, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
}

const fetchAccountAPI = async (auth: string, API_URL: string) => {
  try {
    const apiResponseAccount = await fetch(API_URL + "account", {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const apiResponseJSON: any = await apiResponseAccount.json();

    if (apiResponseJSON.success === false) {
      const errorMessage = apiResponseJSON.error ?? "ImprovMX API Error";
      await showToast(Toast.Style.Failure, "ImprovMX Error", errorMessage);
      return;
    }

    const { email, plan } = apiResponseJSON.account ?? {};

    if (email && plan?.name) {
      await LocalStorage.setItem("improvmx_email", email);
      await LocalStorage.setItem("improvmx_plan_name", plan.name);
      await LocalStorage.setItem("improvmx_unix_timestamp", Math.floor(Date.now() / 1000));
      return email;
    } else {
      const errorMessage = "Failed to parse ImprovMX API response";
      await showToast(Toast.Style.Failure, "ImprovMX Error", errorMessage);
      return;
    }
  } catch (error) {
    console.log(error);
    showToast(Toast.Style.Failure, "ImprovMX Error", "Failed to fetch account details, please check your API key");
    return;
  }
};

const fetchAccont = async (auth: string, API_URL: string) => {
  const improvmx_email = await LocalStorage.getItem("improvmx_email");
  const improvmx_unix_timestamp = (await LocalStorage.getItem("improvmx_unix_timestamp")) as number;

  if (improvmx_unix_timestamp && improvmx_email) {
    const current_unix_timestamp = Math.floor(Date.now() / 1000);
    const difference = current_unix_timestamp - improvmx_unix_timestamp;
    const hours = Math.floor(difference / 3600);
    if (hours < 24) {
      return improvmx_email;
    } else {
      return fetchAccountAPI(auth, API_URL);
    }
  } else {
    return fetchAccountAPI(auth, API_URL);
  }
};

const domainIcon = (domain: Domain) => {
  if (domain.banned || domain.active == false) {
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  } else {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
};

const generatePassword = () => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array(12)
    .fill(chars)
    .map(function (x) {
      return x[Math.floor(Math.random() * x.length)];
    })
    .join("");
};

export { fetchAccont, domainIcon, generatePassword, fetchAccountAPI };
