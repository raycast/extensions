import { showHUD, open, Toast, showToast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Chart } from "./types";
const preferences = getPreferenceValues();

export const duplicateChart = async (data: Chart) => {
  // create toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Duplicating chart",
  });

  // make post request to duplicate the chart
  await fetch(`https://api.datawrapper.de/v3/charts/${data.id}/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${preferences.datawrapperApiKey}` },
  })
    .then((response) => {
      if (response.status === 201) {
        return response.json() as unknown as Chart;
      } else if (response.status === 403) {
        throw new Error("Error, do you have chart:write permission?");
      } else {
        throw new Error("Error duplicating chart");
      }
    })
    .then((newChartData: Chart) => {
      // duplicate chart is created, now move it to the same folder as the original
      if (newChartData) {
        fetch(`https://api.datawrapper.de/v3/charts`, {
          method: "PATCH",
          body: JSON.stringify({
            patch: { folderId: data.folderId, teamId: data.organizationId },
            ids: [newChartData.id],
          }),
          headers: {
            accept: "*/*",
            "content-type": "application/json",
            Authorization: `Bearer ${preferences.datawrapperApiKey}`,
          },
        })
          .then((response) => {
            if (response.status === 200) {
              toast.style = Toast.Style.Success;
              open(`https://app.datawrapper.de/chart/${newChartData.id}/edit`);
              showHUD("Opening newly created chart with ID: " + newChartData.id);
            } else if (response.status === 403) {
              throw new Error("Error, do you have chart:write permission?");
            } else {
              throw new Error(`Chart created, but error moving to folder: ${data.folderId}`);
            }
          })
          .catch((error) => {
            toast.style = Toast.Style.Failure;
            toast.title = error;
          });
      }
    })
    .catch((error) => {
      toast.style = Toast.Style.Failure;
      toast.title = error;
    });
};
