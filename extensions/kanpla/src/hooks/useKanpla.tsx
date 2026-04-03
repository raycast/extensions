import { usePromise } from "@raycast/utils";
import Kanpla from "@taulo1999/kanpla-api/dist/Kanpla";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  email: string;
  password: string;
  firebaseAPIKey: string;
  firebaseModuleId: string;
}

export default function useKanpla() {
  const { email, password, firebaseAPIKey, firebaseModuleId } = getPreferenceValues<Preferences>();

  const kanpla = new Kanpla({
    email,
    password,
    firebaseAPIKey,
    firebaseModuleId,
    language: "en",
  });

  const getMenusByDate = (date: Date) => {
    if (!date) throw new Error("Date is required");

    return usePromise(async () => {
      return await kanpla.getMenusByDate(date);
    });
  };

  const getTodayMenu = () => {
    return usePromise(async () => {
      return await kanpla.getTodayMenu();
    });
  };

  return { getMenusByDate, getTodayMenu };
}
