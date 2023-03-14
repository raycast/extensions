import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import ProtonVersionList from "./Components/ProtonVersionList";
import {
  PROTON_ACCOUNT_URL,
  PROTON_BETA_HEADERS,
  PROTON_CALENDAR_URL,
  PROTON_DRIVE_URL,
  PROTON_MAIL_URL,
} from "./constants";
import { Version } from "./interface";

const ProtonVersion = () => {
  const mailFetch = useFetch<Version>(PROTON_MAIL_URL, PROTON_BETA_HEADERS);
  const driveFetch = useFetch<Version>(PROTON_DRIVE_URL, PROTON_BETA_HEADERS);
  const accountFetch = useFetch<Version>(PROTON_ACCOUNT_URL, PROTON_BETA_HEADERS);
  const calendarFetch = useFetch<Version>(PROTON_CALENDAR_URL, PROTON_BETA_HEADERS);

  const isLoading = mailFetch.isLoading || calendarFetch.isLoading || driveFetch.isLoading || accountFetch.isLoading;

  return (
    <List isLoading={isLoading}>
      <ProtonVersionList environment="beta" product="proton-mail" data={mailFetch.data} />
      <ProtonVersionList environment="beta" product="proton-calendar" data={calendarFetch.data} />
      <ProtonVersionList environment="beta" product="proton-drive" data={driveFetch.data} />
      <ProtonVersionList environment="beta" product="proton-account" data={accountFetch.data} />
    </List>
  );
};

export default ProtonVersion;
