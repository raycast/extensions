import { tmt } from "tencentcloud-sdk-nodejs-tmt";
import { preferences } from "../preferences";

export const tencentTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences?.enableTencentTranslate) {
    return "";
  }
  if (!preferences?.tencentSecretId || !preferences?.tencentSecretKey) {
    throw new Error("Please configure Tencent Cloud API Key first");
  }

  const TmtClient = tmt.v20180321.Client;
  const clientConfig = {
    credential: {
      secretId: preferences.tencentSecretId,
      secretKey: preferences.tencentSecretKey,
    },
    region: "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "tmt.tencentcloudapi.com",
      },
    },
  };
  const client = new TmtClient(clientConfig);
  const params = {
    SourceText: text,
    Source: "auto",
    Target: "en",
    ProjectId: 0,
  };
  const result = await client.TextTranslate(params);
  return result.TargetText ?? "";
};
