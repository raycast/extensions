import { Color } from "@raycast/api"
import { SubjectCollectionType, SubjectType, SubjectVerb, SubjectCollectionColor } from "@/shared/const"
import { CollectionTag } from "@/types"

const BANGUMI_LABELS: Record<string, string> = {
  主角: "Main Character",
  配角: "Supporting",
  客串: "Guest",
  前传: "Prequel",
  续集: "Sequel",
  主线故事: "Main Story",
  番外篇: "Side Story",
  相同世界观: "Same Setting",
  衍生: "Spin-off",
  不同演绎: "Alternative Version",
  主题曲: "Theme Song",
  原声集: "Soundtrack",
  其他: "Other",
  脚本: "Screenwriter",
  原作: "Original Work",
  导演: "Director",
  作画监督: "Animation Director",
  音乐: "Music",
  系列构成: "Series Composition",
  人物设定: "Character Design",
  机械设定: "Mechanical Design",
  美术监督: "Art Director",
  色彩设计: "Color Design",
  摄影监督: "Director of Photography",
  音响监督: "Sound Director",
  剪辑: "Editor",
  制作进行: "Production Assistant",
  企画: "Planning",
  制作管理: "Production Management",
  制作协力: "Production Cooperation",
  制作: "Producer",
  动画制作: "Animation Production",
  发行: "Distribution",
}

const INFOBOX_KEY_LABELS: Record<string, string> = {
  简体中文名: "Chinese Name",
  别名: "Aliases",
  性别: "Gender",
  生日: "Birthday",
  血型: "Blood Type",
  身高: "Height",
  体重: "Weight",
  引用来源: "References",
  英文名: "English Name",
  第二中文名: "Alternative Chinese Name",
  日文名: "Japanese Name",
  纯假名: "Kana",
  昵称: "Nickname",
  罗马字: "Romaji",
}

export const translateBangumiLabel = (label: string): string => BANGUMI_LABELS[label] ?? label

export const translateInfoboxKey = (key: string): string => INFOBOX_KEY_LABELS[key] ?? key

export const getSubjectDisplay = (name?: string, nameCn?: string, fallback = "Unknown") => {
  const title = name || nameCn || fallback
  const subtitle = name && nameCn && name !== nameCn ? (title === name ? nameCn : name) : undefined
  return { title, subtitle }
}

export const getRelationColor = (relation: string): Color => {
  switch (relation) {
    case "主角":
    case "前传":
    case "续集":
    case "主线故事":
    case "番外篇":
      return Color.Red
    case "配角":
    case "相同世界观":
    case "衍生":
      return Color.Blue
    case "客串":
    case "不同演绎":
      return Color.Orange
    default:
      return Color.SecondaryText
  }
}

export const getCollectionTag = (
  collectionType: SubjectCollectionType,
  subjectType: SubjectType = SubjectType.Anime
): CollectionTag => {
  const verbs = SubjectVerb[subjectType]
  const color = SubjectCollectionColor[collectionType]

  switch (collectionType) {
    case SubjectCollectionType.Wish:
      return { value: verbs.wish, color }
    case SubjectCollectionType.Collect:
      return { value: verbs.collect, color }
    case SubjectCollectionType.Doing:
      return { value: verbs.doing, color }
    case SubjectCollectionType.OnHold:
      return { value: "On Hold", color }
    case SubjectCollectionType.Dropped:
      return { value: "Dropped", color }
    default:
      return { value: "Unknown", color }
  }
}

export const formatSummary = (summary?: string) =>
  summary
    ?.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("") || "No summary available."

export const getImageUrl = (url?: string) => {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, "https://")
}
