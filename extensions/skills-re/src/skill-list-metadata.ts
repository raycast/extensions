import { Icon, List } from "@raycast/api";

import { skillPath } from "./api";
import type { Skill, SkillSort } from "./api";
import { formatDate } from "./detail-format";

const formatNumber = (value?: number) =>
  value === undefined ? undefined : Intl.NumberFormat("en", { notation: "compact" }).format(value);

const popularityAccessoryForSkill = (skill: Skill): List.Item.Accessory | undefined => {
  if (skill.downloadsAllTime !== undefined) {
    return { icon: Icon.Download, text: formatNumber(skill.downloadsAllTime) };
  }

  if (skill.stargazerCount !== undefined) {
    return { icon: Icon.Star, text: formatNumber(skill.stargazerCount) };
  }

  if (skill.viewsAllTime !== undefined) {
    return { icon: Icon.Eye, text: formatNumber(skill.viewsAllTime) };
  }

  return undefined;
};

export const sortedMetricAccessoryForSkill = (skill: Skill, sort: SkillSort): List.Item.Accessory | undefined => {
  if (sort === "stars" && skill.stargazerCount !== undefined) {
    return { icon: Icon.Star, text: formatNumber(skill.stargazerCount) };
  }

  if (sort === "views" && skill.viewsAllTime !== undefined) {
    return { icon: Icon.Eye, text: formatNumber(skill.viewsAllTime) };
  }

  if (sort === "downloads-trending" && skill.downloadsTrending !== undefined) {
    return { icon: Icon.Download, text: formatNumber(skill.downloadsTrending) };
  }

  if (sort === "downloads-all-time" && skill.downloadsAllTime !== undefined) {
    return { icon: Icon.Download, text: formatNumber(skill.downloadsAllTime) };
  }

  return undefined;
};

export const accessoriesForSkill = (skill: Skill, sort: SkillSort): List.Item.Accessory[] => {
  const timestamp = sort === "newest" ? skill.createdAt : (skill.updatedAt ?? skill.createdAt);
  const dateAccessory = timestamp === undefined ? undefined : { icon: Icon.Calendar, text: formatDate(timestamp) };
  const accessory = sortedMetricAccessoryForSkill(skill, sort);
  return [dateAccessory, accessory].filter(Boolean) as List.Item.Accessory[];
};

export const savedAccessoriesForSkill = (skill: Skill): List.Item.Accessory[] => {
  const timestamp = skill.updatedAt ?? skill.createdAt;
  const dateAccessory = timestamp === undefined ? undefined : { icon: Icon.Calendar, text: formatDate(timestamp) };
  return [dateAccessory, popularityAccessoryForSkill(skill)].filter(Boolean) as List.Item.Accessory[];
};

export const authorLabelForSkill = (skill: Skill) => skill.author?.name ?? skill.authorHandle;

export const keywordsForSkill = (skill: Skill) =>
  [skillPath(skill), skill.slug, skill.authorHandle, skill.repoName, ...(skill.tags ?? [])].filter(Boolean) as string[];
