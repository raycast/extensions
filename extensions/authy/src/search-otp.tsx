import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import {
  addToCache,
  APPS_KEY,
  AUTHY_ID,
  checkIfCached,
  getFromCache,
  getFromCacheOrDefault,
  OPT_SERVICES_KEY,
  READ_NOTIFICATION,
  SERVICES_KEY,
} from "./cache";
import LoginForm from "./component/login/LoginForm";
import { OtpList } from "./component/otp/OtpList";
import { mapOtpServices } from "./util/utils";
import { AppEntry, AppsResponse, AuthenticatorToken, ServicesResponse } from "./client/dto";
import { logout } from "./component/login/login-helper";
import Export from "./component/export/Export";

export default function Authy() {
  const [isLogin, setLogin] = useState<boolean>();
  const [isReadNotification, setReadNotification] = useState<boolean>(true);

  useEffect(() => {
    async function checkData() {
      if (await checkIfCached(OPT_SERVICES_KEY)) {
        setLogin(true);
        return;
      }

      // TODO: migration to single unified representation of otp service. Delete on the next release
      const services: AuthenticatorToken[] = [];
      const apps: AppEntry[] = [];
      let dataPresent = false;

      if (await checkIfCached(SERVICES_KEY)) {
        const serviceResponse: ServicesResponse = await getFromCache(SERVICES_KEY);
        services.push(...serviceResponse.authenticator_tokens);
        dataPresent = true;
      }

      if (await checkIfCached(APPS_KEY)) {
        const appsResponse: AppsResponse = await getFromCache(APPS_KEY);
        apps.push(...appsResponse.apps);
        dataPresent = true;
      }

      if (dataPresent) {
        const optServices = mapOtpServices(services, apps);
        await addToCache(OPT_SERVICES_KEY, optServices);
      }
      setLogin(dataPresent);
    }

    checkData();
  }, []);

  useEffect(() => {
    // remove cached values if Authy Id has been changed
    async function invalidateCache() {
      const isExist = await checkIfCached(AUTHY_ID);
      if (isExist) {
        const { authyId } = getPreferenceValues<{ authyId: string }>();
        const cachedId = await getFromCache<string>(AUTHY_ID);
        if (authyId != cachedId) {
          await logout();
          setLogin(false);
        }
      }
    }

    invalidateCache();
  });

  useEffect(() => {
    async function checkNotification() {
      const readNotification = await getFromCacheOrDefault(READ_NOTIFICATION, false);
      setReadNotification(readNotification);
    }

    checkNotification();
  }, []);

  if (isLogin == false) {
    return <LoginForm setLogin={setLogin} />;
  }

  if (!isReadNotification) {
    const acceptNotification = async () => {
      await addToCache(READ_NOTIFICATION, true);
      setReadNotification(true);
    };
    return (
      <Detail
        markdown={notification}
        actions={
          <ActionPanel>
            <Action.Push title={"Start Export"} target={<Export />} onPush={acceptNotification} />
            <Action title={"Accept Notification"} onAction={acceptNotification} />
          </ActionPanel>
        }
      />
    );
  }

  return <OtpList isLogin={isLogin} setLogin={setLogin} />;
}

const notification = `
# Authy data breach

Several days ago, Twilio has detected that threat actors were able to identify data associated with Authy accounts, 
including phone numbers, due to an unauthenticated endpoint. Twilio has taken action to secure this endpoint and no 
longer allow unauthenticated requests.
More details are available [here](https://www.twilio.com/en-us/changelog/Security_Alert_Authy_App_Android_iOS)

# Extension current state 
Due to changes in the Authy API, new installation onboarding is currently impossible. 
I recommend exporting your extension data to enable migration to other 2FA apps.
`;
