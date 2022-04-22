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

export const listFiles = async () => {
  await client.getFileList({
    // get_all?: boolean;
    // share_id?: string;
    // drive_id?: string;
    // parent_file_id?: string;
    // marker?: string;
    // limit?: number;
    // all?: boolean;
    // url_expire_sec?: number;
    // image_thumbnail_process?: string;
    // image_url_process?: string;
    // video_thumbnail_process?: string;
    // fields?: string;
    // order_by?: string;
    // order_direction?: string;
  });
};
