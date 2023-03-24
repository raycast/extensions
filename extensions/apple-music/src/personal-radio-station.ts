import { showToast, Toast, open, LocalStorage } from "@raycast/api";
import { fetchAppleMusic } from "./utils/apple-music-api";
import { getMusicUserToken } from "./utils/auth-utils";

export default async function PersonalRadioStation() {
  const isLoggedIn = await getMusicUserToken();

  if (!isLoggedIn) {
    await showToast({
      title: "Log in to continue",
      message: "Please log in to Apple Music to play your personal radio station",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Log in with Apple Music",
        onAction: async () => {
          await open("https://raycast-music-login.gbgk.dev");
        },
      },
    });

    return;
  }

  const cachedRadioUrl = await LocalStorage.getItem("radio-url");

  if (cachedRadioUrl) {
    await open(cachedRadioUrl as string);
    await showToast({ title: "Playing your personal radio station", style: Toast.Style.Success });
    return;
  }

  const toast = await showToast({
    title: "Fetching your personal radio station",
    style: Toast.Style.Animated,
  });

  const { data } = (await fetchAppleMusic("/v1/catalog/{storefront}/stations?filter[identity]=personal").then((res) =>
    res.json()
  )) as {
    data: {
      attributes: {
        url: string;
      };
    }[];
  };

  await LocalStorage.setItem("radio-url", data[0].attributes.url);
  await open(data[0].attributes.url);

  toast.style = Toast.Style.Success;
  toast.title = "Playing your personal radio station";
}
