import { showFailureToast, useFetch } from "@raycast/utils";
import { Single } from "../type";

export default function (id: string) {
  return useFetch<string, undefined, Single>("https://colorhunt.co/php/single.php", {
    method: "POST",
    body: `single=${id}`,
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    mapResult: (data) => {
      return { data: (JSON.parse(data) as unknown as Single[])[0] };
    },
    // keepPreviousData: true,
    onError: async (error) => {
      await showFailureToast(error);
    },
  });
}
