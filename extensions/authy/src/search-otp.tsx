import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { addToCache, APPS_KEY, AUTHY_ID, checkIfCached, getFromCache, OPT_SERVICES_KEY, SERVICES_KEY } from "./cache";
import LoginForm from "./component/login/LoginForm";
import { OtpList } from "./component/otp/OtpList";
import { mapOtpServices } from "./util/utils";
import { AppEntry, AppsResponse, AuthenticatorToken, ServicesResponse } from "./client/dto";
import { logout } from "./component/login/login-helper";

export default function Authy() {
  const [isLogin, setLogin] = useState<boolean>();

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

  if (isLogin == false) {
    return <LoginForm setLogin={setLogin} />;
  }

  return <OtpList isLogin={isLogin} setLogin={setLogin} />;
}
