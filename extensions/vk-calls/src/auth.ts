import { showToast, LaunchProps } from "@raycast/api";
import { authorize, createTokens } from "./vk-oauth";

export default async function Command(
  props: LaunchProps<{
    launchContext?: {
      device_id: string;
      code: string;
    };
  }>,
) {
  console.log(props.launchContext);
  if (props.launchContext) {
    await createTokens(props.launchContext);
    showToast({
      title: "Авторизация прошла успешно",
    });
  } else {
    await authorize();
  }
}
