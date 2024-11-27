import { getPreferenceValues } from "@raycast/api";
import { userAgent } from "./utils/consts";
import { useFetch } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();
interface AssetData {
  isLoading: boolean;
  data: {
    resources: string[];
  };
}

export function getRabbitAsset(route: string, optionalData?: string) {
  const { isLoading, data, revalidate } = useFetch(
    `https://hole.rabbit.tech/apis/${route}?accessToken=${preferences.accessToken}&urls=["${optionalData}"]`,
    {
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
    },
  );

  return { isLoading, data, revalidate };
}

export default function RabbitAsset(file: string) {
  const asset = getRabbitAsset("fetchJournalEntryResources", file) as AssetData;
  const assetType = file.split(".").pop() || "";

  if (asset.isLoading) {
    return `Loading asset... \n\n ![loading your asset...](rabbit-r1-bunny.gif)`;
  }

  if (!asset.data) {
    return `asset could not be displayed`;
  }

  if (["png", "gif", "jpg", "jpeg", "svg", "webp"].includes(assetType)) {
    return `![asset](${asset.data.resources[0]})`;
  } else if (["wav", "mp3"].includes(assetType)) {
    return asset.data.resources[0];
  } else if (["mp4", "mov", "avi", "mkv"].includes(assetType)) {
    return `![asset](${asset.data.resources[0]})`;
  } else {
    return `asset could not be displayed`;
  }
}

//https://hole.rabbit.tech/apis/fetchJournalEntryResources?accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJiOXBBQ2xqeG5JVVBIOHVIYnRZMSJ9.eyJlbWFpbCI6InJvYkByb2JlcnNraW5lLmNvbSIsImFwcF9tZXRhZGF0YSI6eyJyZWdpb24iOiJ1cyJ9LCJyYWJiaXRfcm9sZXMiOltdLCJpc3MiOiJodHRwczovL2xvZ2luLnJhYmJpdC50ZWNoLyIsInN1YiI6ImF1dGgwfDY2NjBhYzk4NjM4YTUzNGM2YTNjZTFlNiIsImF1ZCI6WyJodHRwczovL3JhYmJpdC50ZWNoIiwiaHR0cHM6Ly9yYWJiaXQtcHJvZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzE3ODc0NTc4LCJleHAiOjE3MTc5NjA5NzgsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJNQmkxVkd5SWVrVW1BZmEwOFRHWEwyTVFvMHJ4TkRhYyJ9.HLtw6-ksxLJsmQGHjWufDw2hpSAGHMa_NQQF_tk6QmdAxodNotYUC4-9s_akZhkhHXEKWbhHjRuxoo3sVmcU3doLxX6v-XdRblWLAuThZdeQ7KiwVN6OXEE1F5KxIG_R9E7spIfT_AnM1n4z-5x0UfTIQxEeT70wqj7UTdj-DPabIHTi2PcirSduZG4M99UHhRo7amwrP2xKtaPG0BPQSP5LFrA30C9E--cv0w2VUDmf5tzAQhPYV8GiCXJ5Rnq1V8IABOgy38wBayhRWghFOXi9YbGoXwlTtwSUld2iSk8mBgO1o_1wzb1AZwfSyFbVGFcARFuqGC816X1evdEm7w&urls=%5B%22s3%3A%2F%2Frabbit-prod-user-journal%2Fauth0%7C6660ac98638a534c6a3ce1e6%2F1717709417910-magic-camera.jpg%22%5D

// https://hole.rabbit.tech/apis/fetchJournalEntryResources?accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJiOXBBQ2xqeG5JVVBIOHVIYnRZMSJ9.eyJlbWFpbCI6InJvYkByb2JlcnNraW5lLmNvbSIsImFwcF9tZXRhZGF0YSI6eyJyZWdpb24iOiJ1cyJ9LCJyYWJiaXRfcm9sZXMiOltdLCJpc3MiOiJodHRwczovL2xvZ2luLnJhYmJpdC50ZWNoLyIsInN1YiI6ImF1dGgwfDY2NjBhYzk4NjM4YTUzNGM2YTNjZTFlNiIsImF1ZCI6WyJodHRwczovL3JhYmJpdC50ZWNoIiwiaHR0cHM6Ly9yYWJiaXQtcHJvZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzE5NTkzMjIzLCJleHAiOjE3MTk2Nzk2MjMsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJYYXVDRTVKYU45cG1DY0RIODkzSTIwMVpuTDM1bFR1ciJ9.X9DmxsCg4D3T8NaD3ZDfrj3IB8-Lt7QwmEdEAwoyISrnZXq27IceVoIKEcaFx4TCsLwW1GB9MqGOaB1nNepUUoCiJRfn3whwGWro4gMil-VHFHJ38iy_0f6a8_N5azx8YAlcBKb_FmP1z9Xe1MGDcTZqcv_e-gB1CNSnukQ9Ug_oiiSw5NlHqhM7lhd0Ajp_55zlxcmoigfUJPqRvHWlK7_IzBACK-4Rz2wGK2IToac4UyVX0XRkZ-sZyC9B8GgVphIUAM3GAQ6wWQggTORNEVZIgiTNCRfLeCoxdRTkq1ww9Fgpf5Rv8vuLroruLk1-5QiB9rbGrgbAVBX1EDj8AQ&urls=["s3://rabbit-prod-user-journal/auth0|6660ac98638a534c6a3ce1e6/1719607837963-magic-camera-1.jpg","s3://rabbit-prod-user-journal/auth0|6660ac98638a534c6a3ce1e6/1719607837895-orignal-image.jpg"]
