import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import ProtonVersionList from "./Components/ProtonVersionList";
import { PROTON_ACCOUNT_URL, PROTON_CALENDAR_URL, PROTON_DRIVE_URL, PROTON_MAIL_URL } from "./constants";
import { Version } from "./interface";

const ProtonVersion = () => {
  const mailFetch = useFetch<Version>(PROTON_MAIL_URL);
  const driveFetch = useFetch<Version>(PROTON_DRIVE_URL);
  const accountFetch = useFetch<Version>(PROTON_ACCOUNT_URL);
  const calendarFetch = useFetch<Version>(PROTON_CALENDAR_URL);

  const isLoading = mailFetch.isLoading || calendarFetch.isLoading || driveFetch.isLoading || accountFetch.isLoading;

  return (
    <List isLoading={isLoading}>
      <ProtonVersionList environment="default" product="proton-mail" data={mailFetch.data} />
      <ProtonVersionList environment="default" product="proton-calendar" data={calendarFetch.data} />
      <ProtonVersionList environment="default" product="proton-drive" data={driveFetch.data} />
      <ProtonVersionList environment="default" product="proton-account" data={accountFetch.data} />
    </List>
  );
};

export default ProtonVersion;
