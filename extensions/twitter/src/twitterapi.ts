import { getPreferenceValues } from "@raycast/api";
import { TwitterApi } from "twitter-api-v2";

function createClient(): TwitterApi {
    const pref = getPreferenceValues();
    const appKey = (pref.appkey as string) || "";
    const appSecret = (pref.appsecret as string) || "";
    const accessToken = (pref.accesstoken as string) || "";
    const accessSecret = (pref.accesssecret as string) || "";
    const client = new TwitterApi({
        appKey: appKey,
        appSecret: appSecret,
        accessToken: accessToken,
        accessSecret: accessSecret
    });
    return client;
}

export const twitterClient = createClient();
