import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import type { GetPlant200Response, Plant } from "@/api/api";
import useParams from "@/hooks/useParams";

type PlantExtra = Plant & {
  image_url?: string;
};

type GetPlant200ResponseExtra = GetPlant200Response & {
  data: PlantExtra;
};

const usePlant = (id: number) => {
  const { getPlant } = useParams();
  const { data: requestArgs } = usePromise(getPlant, [`${id}`]);

  return useFetch<GetPlant200ResponseExtra>(`https://trefle.io${requestArgs ? requestArgs.url : ""}`, {
    execute: !!requestArgs,
    keepPreviousData: true,
    parseResponse: async (response) => {
      if (!response.ok) {
        if (response.status !== 404) {
          showFailureToast(new Error(response.statusText), {
            title: "Failed to search plants",
          });
        }
      }
      return response.json();
    },
  });
};

export default usePlant;
