import axios from "axios";
import { showToast, Toast } from "@raycast/api";
import { Roaster, APIResponse } from "./type";

export async function search(query: null | string, countryCode: string, sort: string): Promise<Roaster[]> {
  try {
    const api = "https://api.anycoffee.co/v1/roasters";

    const headers: any = {
      "X-AC-Client-ID": "1e8b50b7-60a5-4066-b0d2-6708e17523bb",
    };

    const params: any = {
      limit: 25,
      sort: sort,
    };

    if (query !== "" && query !== null) {
      params.search = query;
    }

    if (countryCode !== "all") {
      params["location.country[$in]"] = countryCode.toUpperCase();
    }

    const url = new URL(api);
    url.search = new URLSearchParams(params).toString();

    const res = await axios.get<APIResponse>(url.toString(), { headers: headers });
    return res.data.items;
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not load coffee roaster results",
      message: String(err),
    });
    return Promise.resolve([]);
  }
}
