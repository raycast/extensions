import createRCDClient, {
  type OpenApiMethodResponse,
  type OpenApiClient,
  type OpenApiClientPathsWithMethod,
  type OpenApiMaybeOptionalInit,
  type OpenApiRequiredKeysOf,
  type RCDClient,
} from "rclone-sdk";

const client = createRCDClient({
  baseUrl: "http://localhost:5572",
});

type ClientPaths<T> = T extends OpenApiClient<infer P, `${string}/${string}`> ? P : never;
type Paths = ClientPaths<RCDClient>;
type InitParam<Init> =
  OpenApiRequiredKeysOf<Init> extends never
    ? [(Init & { [key: string]: unknown })?]
    : [Init & { [key: string]: unknown }];

export default async function rclone<
  Path extends OpenApiClientPathsWithMethod<RCDClient, "post">,
  Init extends OpenApiMaybeOptionalInit<Paths[Path], "post"> = OpenApiMaybeOptionalInit<Paths[Path], "post">,
>(path: Path, ...init: InitParam<Init>): Promise<OpenApiMethodResponse<RCDClient, "post", Path, Init>> {
  console.log("[rclone] STARTING", path);

  console.log("[rclone] init", init);
  let result;
  try {
    result = await client.POST(path, ...(init as InitParam<OpenApiMaybeOptionalInit<Paths[Path], "post">>));
  } catch (error) {
    if (isFetchFailedError(error)) {
      console.error("[rclone] fetch failed", error);
      throw new Error("Is the rclone daemon running?");
    }
    throw error;
  }

  if (result?.error) {
    console.log("[rclone] result?.error", result.error);
    const message = typeof result.error === "string" ? result.error : JSON.stringify(result.error);

    throw new Error(message);
  }

  const data = result.data as { error?: unknown } | undefined;

  // console.log('[rclone] data', data)

  if (data?.error) {
    console.log("[rclone] data?.error", data.error);
    const message = typeof data.error === "string" ? data.error : JSON.stringify(data.error);

    throw new Error(message);
  }

  if (!result.response.ok) {
    console.log("[rclone] !result.response.ok", result.response.status, result.response.statusText);
    throw new Error(`${result.response.status} ${result.response.statusText}`);
  }

  console.log("[rclone] ENDING", path);

  return result.data as OpenApiMethodResponse<typeof client, "post", Path, Init>;
}

function isFetchFailedError(error: unknown): error is TypeError {
  return error instanceof TypeError && typeof error.message === "string" && error.message.includes("fetch failed");
}
