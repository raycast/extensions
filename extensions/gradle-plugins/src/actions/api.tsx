import axios from "axios";
import { getConfig } from "../config";
import { Cheerio, load } from "cheerio";
import {
  GradlePlugin,
  GradlePluginDetail,
  GradlePluginResponse,
  PluginImplementation,
  PluginType,
  Version,
} from "../models/gradle-plugin";

export async function getGradlePluginDetail(pluginURL: string): Promise<GradlePluginDetail> {
  const url = new URL(pluginURL);

  const response = await axios.get(url.toString());

  const $ = load(response.data);

  const versions = $(".version-info .dropdown-menu li").map((index, element): Version => {
    return {
      link: $(element).find("a").attr("href")!,
      version: $(element).find("a").text().trim(),
    };
  });

  const implementations = $(".tabpanel .nav-tabs li").map((index, element): PluginImplementation => {
    const type = $(element).find("a").text().trim() as PluginType;
    const implementationDetails =
      type === "Groovy" ? $("#groovy-usage .language-groovy") : $("#kotlin-usage .language-kotlin");

    return {
      type,
      pluginDSL: implementationDetails.first().text(),
      legacyPlugin: implementationDetails.last().text(),
    };
  });

  const $version = $(".version-info");

  return {
    name: $(".detail h1").text().trim(),
    sourceLink: $(".website a").attr("href"),
    owner: {
      avatar: $("#plugin-owner-link .owner-avatar").attr("src"),
      name: $("#plugin-owner-link").text().trim(),
    },
    selectedVersion: {
      name: $version.find("h3").text().trim(),
      releaseDate: $version.find(".version-created-date").text().replace(".", "").trim(),
      description: $version.find(".description-text").text().trim(),
    },
    implementations: implementations.toArray(),
    versions: versions.toArray(),
  };
}

export async function getGradlePlugins(
  searchQuery: string | null,
  customURL: string | null,
): Promise<GradlePluginResponse> {
  const { gradleURL } = getConfig();

  const url = new URL(customURL ?? `${gradleURL}/search`);

  if (searchQuery && !customURL) {
    url.searchParams.set("term", searchQuery);
  }

  const response = await axios.get(url.toString());

  const $ = load(response.data);

  const plugins = $("#search-results tbody tr")
    .map((_, element): GradlePlugin => {
      const $pluginNameContainer = $(element).find(".name");
      const $pluginVersionContainer = $(element).find(".version");
      const $pluginLink = $pluginNameContainer.find(".plugin-id a");

      const name = $pluginLink.text().trim();
      const description = $pluginNameContainer.find(".plugin-id").next().text();
      const link = $pluginLink.attr("href")!;
      const $version = $pluginVersionContainer.find(".latest-version");
      const $releaseDate = $pluginVersionContainer.find(".date");

      const pluginTags: Cheerio<string> = $pluginNameContainer.find(".plugin-tag").map((index, element): string => {
        return $(element).text().trim();
      });

      return {
        name,
        description,
        link: gradleURL + link,
        tags: pluginTags.toArray(),
        releaseDate: $releaseDate.text().replace("(", "").replace(")", "").trim(),
        latestVersion: $version.text().trim(),
      };
    })
    .filter((_, element) => element.name !== "");

  const previousPageLink = $('.results.box .page-link :contains("Previous")').attr("href");
  const nextPageLink = $('.results.box .page-link :contains("Next")').attr("href");

  return {
    items: plugins.toArray(),
    previousPage: previousPageLink ? gradleURL + previousPageLink : null,
    nextPage: nextPageLink ? gradleURL + nextPageLink : null,
  };
}
