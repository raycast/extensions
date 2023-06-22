import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import {
  APPS_KEY,
  AUTHY_ID,
  checkIfCached,
  DEVICE_ID,
  getFromCache,
  removeFromCache,
  REQUEST_ID,
  SECRET_SEED,
  SERVICES_KEY,
} from "./cache";
import LoginForm from "./component/LoginForm";
import { OtpList } from "./component/OtpList";

export default function Authy() {
  const [isLogin, setLogin] = useState<boolean>();

  useEffect(() => {
    async function checkData() {
      const services = await checkIfCached(SERVICES_KEY);
      const apps = await checkIfCached(APPS_KEY);
      setLogin(services || apps);
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
          await removeFromCache(SECRET_SEED);
          await removeFromCache(DEVICE_ID);
          await removeFromCache(SERVICES_KEY);
          await removeFromCache(APPS_KEY);
          await removeFromCache(REQUEST_ID);
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
