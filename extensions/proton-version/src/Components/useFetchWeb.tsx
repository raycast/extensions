import { useFetch } from "@raycast/utils";
import { WebEnv, WebVersion } from "../interface";

const betaHeaders = {
  headers: {
    cookie: "Tag=beta",
  },
};

const useFetchWeb = (environment: WebEnv) => {
  const mailFetch = useFetch<WebVersion>(
    "https://mail.proton.me/assets/version.json",
    environment === "beta" ? betaHeaders : undefined
  );

  const driveFetch = useFetch<WebVersion>(
    "https://drive.proton.me/assets/version.json",
    environment === "beta" ? betaHeaders : undefined
  );

  const accountFetch = useFetch<WebVersion>(
    "https://account.proton.me/assets/version.json",
    environment === "beta" ? betaHeaders : undefined
  );

  const calendarFetch = useFetch<WebVersion>(
    "https://calendar.proton.me/assets/version.json",
    environment === "beta" ? betaHeaders : undefined
  );

  const isLoading = mailFetch.isLoading || calendarFetch.isLoading || driveFetch.isLoading || accountFetch.isLoading;

  return {
    isLoading,
    mailFetch,
    driveFetch,
    accountFetch,
    calendarFetch,
  };
};

export default useFetchWeb;
