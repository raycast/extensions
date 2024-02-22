import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

interface I_preferences {
  clientId: string;
  clientSecret: string;
}

const { clientId, clientSecret } = getPreferenceValues<I_preferences>();

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  },
});

export default axiosInstance;
