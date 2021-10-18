import { getPreferenceValues } from "@raycast/api";
import { AccountSettingsV1, TwitterApi } from "twitter-api-v2";

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

let activeAccount: AccountSettingsV1 | undefined;

export async function loggedInUserAccount(): Promise<AccountSettingsV1> {
    if (!activeAccount) {
        const account = await twitterClient.v1.accountSettings();
        activeAccount = account;
    }
    return activeAccount;
}