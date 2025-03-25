import axios from "axios";
import { showHUD } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { userAgent } from "./utils/consts";

const preferences = getPreferenceValues<Preferences>();

interface ProfileResponse {
  name: string;
}

const config = {
  headers: {
    "User-Agent": userAgent,
  },
};

const rabbitUrl = `https://hole.rabbit.tech/apis/updateUserProfile`;

const fetchData = async (): Promise<ProfileResponse | undefined> => {
  try {
    const response = await axios.patch(
      rabbitUrl,
      { accessToken: preferences.accessToken, profile: { name: "Rob" } },
      config,
    );
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export default async function Command() {
  const data = await fetchData();
  if (!data) {
    showHUD("rabbit hole token could not be updated. please manually update it in preferences.");
    return;
  }
  //showHUD("rabbit hole token updated successfully");
}
