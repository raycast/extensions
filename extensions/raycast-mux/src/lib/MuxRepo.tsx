import { Effect } from "effect";
import { FileSystem, HttpBody, HttpClient } from "@effect/platform";
import { MuxService } from "./MuxService.js";
import { MuxAssetError } from "./Errors.js";
import { PaginationOptions } from "@raycast/utils/dist/types.js";
import { Asset } from "@mux/mux-node/src/resources/video/assets.js";
import { UploadForm } from "../upload-asset.js";
import Mux from "@mux/mux-node";
import { environment } from "@raycast/api";
import { LiveStream } from "@mux/mux-node/src/resources/video/live-streams.js";

export class MuxRepo extends Effect.Service<MuxRepo>()("MuxRepo", {
  accessors: true,
  effect: MuxService.pipe(
    Effect.map((mux) => ({
      getAssets: (options: PaginationOptions<Asset[]>) =>
        Effect.tryPromise({
          try: () =>
            mux.video.assets.list({
              page: options.page,
            }),
          catch: (e) => new MuxAssetError(e),
        }),
      getAsset: (id: string) =>
        Effect.tryPromise({
          try: () => mux.video.assets.retrieve(id),
          catch: (e) => new MuxAssetError(e),
        }),
      getByPlaybackId: (id: string) =>
        Effect.tryPromise({
          try: () => mux.video.playbackIds.retrieve(id),
          catch: (e) => new MuxAssetError(e),
        }),
      enableMp4: (id: string) =>
        Effect.tryPromise({
          try: () =>
            mux.video.assets.updateMP4Support(id, {
              mp4_support: "capped-1080p",
            }),
          catch: (e) => new MuxAssetError(e),
        }),
      deleteAsset: (id: string) =>
        Effect.tryPromise({
          try: () => mux.video.assets.delete(id),
          catch: (e) => new MuxAssetError(e),
        }),
      createAsset: (data: UploadForm) =>
        Effect.tryPromise({
          try: () => {
            const playback_policy: Mux.Video.Assets.AssetOptions["playback_policy"] = [];
            if (data.privacyPublic) playback_policy.push("public");
            if (data.privacySigned) playback_policy.push("signed");
            if (data.privacyDrm) playback_policy.push("drm");

            const params: Mux.Video.UploadCreateParams = {
              new_asset_settings: {
                playback_policy,
                video_quality: data.videoQuality,
                max_resolution_tier: data.maxResolutionTier,
                input: [
                  {
                    generated_subtitles: data.generateCaptions.map((lang) => ({
                      language_code: lang,
                      name: `${lang} CC`,
                    })),
                  },
                ],
                passthrough: data.passthru,
              },
              cors_origin: "*",
              test: environment.isDevelopment,
            };

            return mux.video.uploads.create(params);
          },
          catch: (e) => new MuxAssetError(e),
        }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      upload: (filepath: string, upload: Mux.Video.Upload) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const http = yield* HttpClient.HttpClient;

          const fileStream = fs.stream(filepath);

          return yield* http.put(upload.url, {
            body: HttpBody.stream(fileStream),
          });
        }),

      getLiveStreams: (options: PaginationOptions<LiveStream[]>) =>
        Effect.tryPromise({
          try: () =>
            mux.video.liveStreams.list({
              page: options.page,
            }),
          catch: (e) => new MuxAssetError(e),
        }),
      disableLiveStream: (id: string) =>
        Effect.tryPromise({
          try: () => mux.video.liveStreams.disable(id),
          catch: (e) => new MuxAssetError(e),
        }),
      enableLiveStream: (id: string) =>
        Effect.tryPromise({
          try: () => mux.video.liveStreams.enable(id),
          catch: (e) => new MuxAssetError(e),
        }),
      resetStreamKey: (id: string) =>
        Effect.tryPromise({
          try: () => mux.video.liveStreams.resetStreamKey(id),
          catch: (e) => new MuxAssetError(e),
        }),
    })),
  ),
}) {}
