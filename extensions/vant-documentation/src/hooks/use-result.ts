import { useMemo, useRef } from "react";
import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";
import { EN_US, VANT_WEBSITE, GITHUB_API, getToastText } from "@/utils";

import type { DocItem, DetailsData } from "@/type";

const cleanupHomeContent = (language: string, docItem: DocItem, data: string): string => {
  let content = data;

  const handleIntroduce = (text: string): string => {
    const section = language === EN_US ? "Features" : "介绍";
    const content = text.replace(new RegExp(`^[\\s\\S]*?(?=###\\s*${section})`), "");
    return content;
  };

  const handleSupport = (text: string): string => {
    const content = text.replace(/(\|[^|]*\s*\|\s*)[^|]*\s*!\[\]\(.*?\)\s*(\|)/g, "$1$2");
    return content;
  };

  const handleCoreTeam = (text: string): string => {
    const coreTeamHeader = language === EN_US ? "### Core Team" : "### 核心团队";
    const allContributorsHeader = language === EN_US ? "### All Contributors" : "### 贡献者们";
    const replacementContent = `[${language === EN_US ? "View in browser" : "在浏览器中查看"}](${VANT_WEBSITE}/${docItem.version}/#/${language})`;
    const regex = new RegExp(`${coreTeamHeader}[\\s\\S]*?${allContributorsHeader}`, "g");
    const content = text.replace(regex, `${coreTeamHeader}\n\n${replacementContent}\n\n${allContributorsHeader}`);
    return content;
  };

  const handleContributions = (text: string): string => {
    const coreTeamHeader = language === EN_US ? "### All Contributors" : "### 贡献者们";
    const allContributorsHeader = language === EN_US ? "### Contribution Guide" : "### 贡献指南";
    const replacementContent = `[${language === EN_US ? "View in browser" : "在浏览器中查看"}](${VANT_WEBSITE}/${docItem.version}/#/${language})`;
    const regex = new RegExp(`${coreTeamHeader}[\\s\\S]*?${allContributorsHeader}`, "g");
    const content = text.replace(regex, `${coreTeamHeader}\n\n${replacementContent}\n\n${allContributorsHeader}`);
    return content;
  };

  content = handleIntroduce(content);
  content = handleSupport(content);
  content = handleCoreTeam(content);
  content = handleContributions(content);

  return content;
};

const filterContent = (language: string, docItem: DocItem, res: DetailsData): string => {
  let content = Buffer.from(res.content, "base64").toString("utf-8");

  const INTRODUCTION_COMPONENT_NAME = "HOME";

  if (docItem.component.toLocaleUpperCase() === INTRODUCTION_COMPONENT_NAME) {
    return cleanupHomeContent(language, docItem, content);
  }

  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, href) => {
    if (href.startsWith("http")) {
      return match;
    }

    const url = `${VANT_WEBSITE}/${docItem.version}/#/${language}/${href.split("/").at(-1).split("#").at(0)}`;

    return `[${text}](${url})`;
  });

  return content;
};

export const useDetails = (language: string, docItem: DocItem) => {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate, error } = useCachedPromise(
    async (url: string) => {
      showToast({
        style: Toast.Style.Animated,
        title: getToastText(language, Toast.Style.Animated),
      });

      const response = await fetch(url, { signal: abortable.current?.signal });
      if (response.status !== 200) {
        throw new Error(`${response.status} - ${response.statusText}`);
      }

      const res = (await response.json()) as DetailsData;

      const content = filterContent(language, docItem, res);

      showToast({
        style: Toast.Style.Success,
        title: getToastText(language, Toast.Style.Success),
      });

      return content;
    },
    [GITHUB_API + docItem.filePath],
    {
      keepPreviousData: true,
      abortable,
      onError: () => {
        showToast({
          style: Toast.Style.Failure,
          title: getToastText(language, Toast.Style.Failure),
        });
      },
    },
  );

  const content = useMemo(() => {
    return data || "";
  }, [data]);

  return { isLoading, content, revalidate, error };
};
