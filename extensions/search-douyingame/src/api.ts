import axios from "axios";

export interface GameResponse {
  id: string;
  name: string;
}

interface QueryGameListResponse {
  data: {
    game_list: {
      game_id: string;
      name: string;
    }[];
  };
}

const API_BASE_URL = "https://ark-operation.bytedance.net";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Content-Type": "application/json",
    Origin: "https://ark-operation.bytedance.net",
    Referer: "https://ark-operation.bytedance.net/creator/1038/gameManagement/operationManagement",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    appId: "3000",
    skipAuthCheck: "true",
    skipModify: "false",
    webID: "1038",
    "x-appid": "3000",
    "x-sub-web-id": "1038",
    Cookie:
      "email=liwenjie.me@bytedance.com; people-lang=zh; lang=zh; b.digest=ScDWZzrxrJOMPHmckLUJrJ64ypPyiC75tTnBBptrUo8=; digest=EmhA5YFpZc4F4YkA+zeemUvs7uYnQJm1Yj1jART2q6I=; digest.north=K5/430b2rzra4Tlvq3+OrjyYudxdd9KyVn3GYUcYyiw=; passport_csrf_token=4375769448805e52730f72e32c444599; ttwid=1%7CfgDJSfdK4IyCicNpkXktDSlqM9K0xz0Kf8_J6_ArKZs%7C1736319393%7Cbd60194c7b8efb64a0b234d18cf9c10ea829fcae0685fe393108084c8a49dc9e; user_token=JTdCJTIybmFtZSUyMiUzQSUyMiVFNiU5RCU4RSVFNiU5NiU4NyVFNiU5RCVCMCUyMiUyQyUyMmZ1bGxfbmFtZSUyMiUzQSUyMiVFNiU5RCU4RSVFNiU5NiU4NyVFNiU5RCVCMCUyMDY4OTMzOTglMjIlMkMlMjJlbWFpbCUyMiUzQSUyMmxpd2VuamllLm1lJTQwYnl0ZWRhbmNlLmNvbSUyMiUyQyUyMnBpY3R1cmUlMjIlM0ElMjJodHRwcyUzQSUyRiUyRnMxLWltZmlsZS5mZWlzaHVjZG4uY29tJTJGc3RhdGljLXJlc291cmNlJTJGdjElMkZ2Ml9iY2NiNGYzMS0zZGI2LTRlNDAtYjIxOS1lY2E3N2ZlNzk0ZWd+JTNGaW1hZ2Vfc2l6ZSUzRDI0MHgyNDAlMjZjdXRfdHlwZSUzRCUyNnF1YWxpdHklM0QlMjZmb3JtYXQlM0RwbmclMjZzdGlja2VyX2Zvcm1hdCUzRC53ZWJwJTIyJTJDJTIyZW1wbG95ZWVfaWQlMjIlM0ElMjI2ODkzMzk4JTIyJTJDJTIyZW1wbG95ZWVfbnVtYmVyJTIyJTNBJTIyNjg5MzM5OCUyMiUyQyUyMnRlbmFudF9hbGlhcyUyMiUzQSUyMmJ5dGVkYW5jZSUyMiUyQyUyMnVzZXJfaWQlMjIlM0ElMjJ3ZDFpZW9oNDQ3cTFtdmh2NHp5cSUyMiU3RA==; _sys_language_key=zh-CN; fid=498c18c1-0a59-4d60-bbd2-64a263b11288; titan_passport_id=cn/bytedance/d2d470f3-9c18-42e9-89cb-5ddb47b5135c; odin_tt=92c4818b9409fe651e579cfa6b10929f79c9f875f18561315b8458adab0daaf1a52fd9b2560ac58161accaeb3c2e1b734f9519c20fafd69f4e64808ca7297176; uid_tt_ss_webcast_union=955aa5fd180e2d84adcc11e872bfd888; sessionid_ss_webcast_union=45504e15e88d74b331e94a0ea29df00f; sid_ucp_v1_webcast_union=1.0.0-KGRlZTk1ODhmNTUxOGE5MDg4NWU2NzcwM2I4YTVlNjUxMzllNzVjYzEKHAigg-CGxY2XBhDn3aW9Bhj6DSAMMLeclJ4GOAgaAmhsIiA0NTUwNGUxNWU4OGQ3NGIzMzFlOTRhMGVhMjlkZjAwZg; ssid_ucp_v1_webcast_union=1.0.0-KGRlZTk1ODhmNTUxOGE5MDg4NWU2NzcwM2I4YTVlNjUxMzllNzVjYzEKHAigg-CGxY2XBhDn3aW9Bhj6DSAMMLeclJ4GOAgaAmhsIiA0NTUwNGUxNWU4OGQ3NGIzMzFlOTRhMGVhMjlkZjAwZg; x-lang=zh-CN; sid_guard_webcast_union=45504e15e88d74b331e94a0ea29df00f%7C1739524007%7C2225217%7CWed%2C+12-Mar-2025+03%3A13%3A44+GMT; uid_tt_webcast_union=955aa5fd180e2d84adcc11e872bfd888; sid_tt_webcast_union=45504e15e88d74b331e94a0ea29df00f; sessionid_webcast_union=45504e15e88d74b331e94a0ea29df00f; is_staff_user_webcast_union=false; csrf_session_id=481fc66cbb673fc842e925378484c1d2; s_v_web_id=verify_m74jokmc_JW9U9wZ9_PD2J_49o6_9iT1_zOkc4WcqZDdJ; operator_role=1; bd_sso_3b6da9=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDAzNjU4MzQsImlhdCI6MTczOTc2MTAzNCwiaXNzIjoic3NvLmJ5dGVkYW5jZS5jb20iLCJzdWIiOiJ3ZDFpZW9oNDQ3cTFtdmh2NHp5cSIsInRlbmFudF9pZCI6ImhncTN0Y2NwM2kxc2pqbjU4emlrIn0.dLp-veT3uJwInbDTiTnUmljmXfay8v_KSa2f19IYJdDsB8TxkAO0a1s93nrrGEp4gNtDEEYEvDLsOtYoysFvtq7IY9wgsMquK3x-6K1V3ueA55mpNsSFvmmHKXQjxeyJqbVeAMaicRLCFaPnwaw3KVZlA0o1Uyvh3hZ1Uxx4WdaGvwvewZyZlNWimjJcsAK9lbglp6fyG_e1lotDvRiRyfm3R-PbfnkqrV1G5Hae9S5MUHEs5IiU2oHtl-H8FqERYEn1dXNdedX_g-fD2hYGoSmj3-4bA8A7atnJlCiU_HwTVhQrxvj2RmFRbeJGirlTsFCz6dmtwYKPXo-0rWJGUg",
  },
});

export async function searchGames(query: string): Promise<GameResponse[]> {
  try {
    const response = await api.post<QueryGameListResponse>("/webcast/gutenberg/game_info/query_operation_game_list/", {
      filter: {
        is_test_game: false,
        name: query,
      },
      offset: 0,
      limit: 10,
    });

    return response.data.data.game_list.map((game: { game_id: string; name: string }) => ({
      id: game.game_id,
      name: game.name,
    }));
  } catch (error) {
    console.error("Failed to fetch games:", error);
    throw new Error("获取游戏列表失败");
  }
}
