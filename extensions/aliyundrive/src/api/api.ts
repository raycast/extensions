import { AliyunDriveClient, isTokenInvalid } from "@chyroc/aliyundrive";
import { cookieStore, tokenStore } from "./local_store";

export const client = new AliyunDriveClient({
  tokenStore,
  cookieStore,
});

export const getLoginUser = async (client: AliyunDriveClient) => {
  try {
    const user = await client.getSelfUser();
    return {
      user: user.data,
      tokenInvalid: false,
      msg: "",
    };
  } catch (e) {
    if (isTokenInvalid(e)) {
      return {
        user: undefined,
        tokenInvalid: true,
        msg: "",
      };
    }
    return {
      user: undefined,
      tokenInvalid: false,
      msg: `${e}`,
    };
  }
};
