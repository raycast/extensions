import { Action, Color, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { getPlayHistory } from "../helpers/nintendo";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const GAME_GENERES = [
  { code: "ACTION", color: "#7FDBFF", label_zh: "動作" },
  { code: "ADVENTURE", color: "#2ECC40", label_zh: "冒險" },
  { code: "ARCADE", color: "#FFDC00", label_zh: "街機" },
  { code: "EDUCATION", color: "#FF851B", label_zh: "學習" },
  { code: "FIGHTING", color: "#FF4136", label_zh: "格鬥" },
  { code: "FIRST_PERSON", color: "#B10DC9", label_zh: "射擊" },
  { code: "LIFESTYLE", color: "#F012BE", label_zh: "實用" },
  { code: "MULTIPLAYER", color: "#0074D9", label_zh: "交流" },
  { code: "MUSIC", color: "#FFD700", label_zh: "音樂" },
  { code: "OTHER", color: "#AAAAAA", label_zh: "其他" },
  { code: "PARTY", color: "#39CCCC", label_zh: "派對" },
  { code: "PLATFORMER", color: "#3D9970", label_zh: "桌上遊戲" },
  { code: "PUZZLE", color: "#01FF70", label_zh: "益智" },
  { code: "RACING", color: "#85144b", label_zh: "競速" },
  { code: "ROLE_PLAYING", color: "#FF7F50", label_zh: "角色扮演" },
  { code: "SIMULATION", color: "#2E4053", label_zh: "模擬" },
  { code: "SPORTS", color: "#8FBC8F", label_zh: "運動" },
  { code: "STRATEGY", color: "#6A5ACD", label_zh: "策略" },
  { code: "TRAINING", color: "#9ACD32", label_zh: "訓練" },
];
const parseHKStoreGameHTML = (html: string) => {
  const regex = /NXSTORE\.titleDetail\.jsonData\s*=\s*({.*?});/;
  const match = html.match(regex);
  const data = match && JSON.parse(match[1]);
  if (!data) {
    return;
  }
  return {
    name: data.applications.formal_name,
    headline: data.catch_copy,
    description: data.description,
    playModes: data.play_styles.map((playStyle: any) => ({ code: playStyle.name })),
    releaseDate: data.release_date_on_eshop,
    romFileSize: data.total_rom_size,
    supportedLanguages: data.languages.map((language: any) => language.name),
    screenshots: data.screenshots.map((screenshot: { images: { url: string }[] }) =>
      screenshot.images.map((image) => image.url)
    ),
    genres: data.genre.split(" / ").map((label: string) => {
      const genre = GAME_GENERES.find((gameGenre) => gameGenre.label_zh === label);
      return {
        label: genre?.label_zh || label,
        color: genre?.color || Color.PrimaryText,
      };
    }),
    publisher: data.publisher?.name,
  };
};
const parseUSStoreGameHTML = (html: string) => {
  const $ = cheerio.load(html);
  const scriptEl = $("#__NEXT_DATA__");
  const scriptContent = scriptEl.html();
  const data = scriptContent && JSON.parse(scriptContent);
  if (!data?.props?.pageProps?.product) {
    return;
  }
  return {
    name: data.props.pageProps.product.name,
    headline: data.props.pageProps.product.headline,
    description: data.props.pageProps.product.description,
    playModes: data.props.pageProps.product.playModes,
    releaseDate: data.props.pageProps.product.releaseDate,
    romFileSize: data.props.pageProps.product.romFileSize,
    supportedLanguages: data.props.pageProps.product.supportedLanguages,
    screenshots: data.props.pageProps.product.productGallery.map(
      (item: { resourceType: "video" | "image"; publicId: string }) => {
        if (item.resourceType === "image") {
          return "https://assets.nintendo.com/image/upload/" + item.publicId;
        }
      }
    ),
    genres: data.props.pageProps.product.genres.map((genre: any) => {
      const gameGenre = GAME_GENERES.find((gameGenre) => gameGenre.code === genre.code);
      return {
        label: genre.label,
        color: gameGenre?.color || Color.PrimaryText,
      };
    }),
    publisher: data.props.pageProps.product.softwarePublisher || data.props.pageProps.product.softwareDeveloper,
  };
};
const getStoreGameUrl = async (titleId: string, region: "HK" | "US") => {
  const url = `https://ec.nintendo.com/apps/${titleId}/${region}`;
  const redirectUrl = await fetch(url).then((res) => res.url);
  return redirectUrl;
};
const getGameInfo = async (titleId: string, region: "HK" | "US") => {
  const url = await getStoreGameUrl(titleId, region);
  const html = await fetch(url).then((res) => res.text());
  if (region === "HK") {
    return parseHKStoreGameHTML(html);
  }
  if (region === "US") {
    return parseUSStoreGameHTML(html);
  }
};
const useGameInfo = (titleId: string) => {
  const abortable = useRef<AbortController>();
  const gameInfo = useCachedPromise(getGameInfo, [titleId, "US"], {
    keepPreviousData: true,
    execute: false,
    abortable,
    onError: (error) => {
      showToast(Toast.Style.Failure, error.name, error.message);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Loading");
    },
    onData: () => {
      showToast(Toast.Style.Success, "Success");
    },
  });
  useEffect(() => {
    if (!gameInfo.data) {
      gameInfo.revalidate();
    }
  }, []);
  return gameInfo;
};

export default function GameInfoDetail({ titleId }: { titleId: string }) {
  const gameInfo = useGameInfo(titleId);
  const gamePlayHistory = getPlayHistory(titleId);
  if (!gamePlayHistory) {
    return (
      <List>
        <List.EmptyView />
      </List>
    );
  }
  const markdown = `
   # ${gameInfo.data?.name || ""}
   
   ### \`${gameInfo.data?.publisher || ""}\`
   ### \`${dayjs(gameInfo.data?.releaseDate).format("MMMM DD,YYYY")}\`

   > **${gameInfo.data?.headline || ""}**
   
   ${gameInfo.data?.screenshots
     .filter(Boolean)
     .map((screenshot: string) => `![](${screenshot})`)
     .join("\n\n")}
   `;
  return (
    <Detail
      isLoading={gameInfo.isLoading}
      navigationTitle={gameInfo.data?.name || gamePlayHistory.titleName}
      markdown={gameInfo.data ? markdown : `# ${gamePlayHistory.titleName}`}
      metadata={
        <Detail.Metadata>
          {/* <Detail.Metadata.Label title="First Played Time" text={dayjs(gamePlayHistory.firstPlayedAt).fromNow()} /> */}
          <Detail.Metadata.Label title="Last Played Time" text={dayjs(gamePlayHistory.lastPlayedAt).fromNow()} />
          <Detail.Metadata.Label
            title="Weekly (Total) Played Time"
            text={gamePlayHistory.weeklyPlayedMinutes + " mins" + " (" + gamePlayHistory.totalPlayTime + ")"}
          />
          {gameInfo.data && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Genre">
                {gameInfo.data?.genres.map((genre: any) => {
                  return <Detail.Metadata.TagList.Item text={genre.label} color={genre.color} />;
                })}
              </Detail.Metadata.TagList>
              <Detail.Metadata.TagList title="Supported play modes">
                {gameInfo.data?.playModes.map((mode: any) => {
                  return <Detail.Metadata.TagList.Item text="" icon={{ source: `${mode.code}.svg` }} />;
                })}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label
                title="Game file size"
                text={(gameInfo.data?.romFileSize / 1024 / 1024 / 1024).toFixed(1) + " GB"}
              />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
export const PushGameInfoDetailAction = (props: { titleId: string }) => {
  return <Action.Push title="Game Detail" target={<GameInfoDetail {...props} />} />;
};
