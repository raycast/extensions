import { Cache, getPreferenceValues } from "@raycast/api";
import { Repository } from "@yuntoo/aliyun-codeup-open-api";

export const cacheRepository = new Cache();

const { organizationId, accessToken }: Preferences = getPreferenceValues();
export const repository = new Repository({ organizationId, accessToken });
