export interface Response {
  data: Data;
}

export interface Data {
  bankaraSchedules: Schedule<BankaraScheduleNode>;
  coopGroupingSchedule: CoopGroupingSchedule;
  regularSchedules: Schedule<RegularScheduleNode>;
  xSchedules: Schedule<XScheduleNode>;
}

export type Mode = "ranked-open" | "ranked-series" | "regular" | "x";

export interface Schedule<TScheduleNode extends ScheduleNode> {
  nodes: TScheduleNode[];
}

export interface CoopGroupingSchedule {
  bannerImage: Image | null;
  regularSchedules: Schedule<CoopScheduleNode>;
}

export interface ScheduleNode {
  endTime: string;
  startTime: string;
}

export interface RegularScheduleNode extends ScheduleNode {
  regularMatchSetting: MatchSetting;
}

export interface BankaraScheduleNode extends ScheduleNode {
  bankaraMatchSettings: BankaraMatchSetting[];
}

export interface BankaraScheduleSingleNode extends ScheduleNode {
  bankaraMatchSetting: BankaraMatchSetting;
}

export interface XScheduleNode extends ScheduleNode {
  xMatchSetting: MatchSetting;
}

export interface CoopScheduleNode extends ScheduleNode {
  setting: CoopSetting;
}

export interface MatchSetting {
  vsRule: Rule;
  vsStages: Stage[];
}

export interface BankaraMatchSetting extends MatchSetting {
  bankaraMode: "CHALLENGE" | "OPEN";
}

export interface CoopSetting {
  coopStage: Stage;
  weapons: Weapon[];
}

export interface Rule {
  id: string;
  name: "Clam Blitz" | "Rainmaker" | "Splat Zones" | "Tower Control" | "Turf War";
  rule: "AREA" | "CLAM" | "GOAL" | "LOFT" | "TURF_WAR";
}

export interface Stage {
  id: string;
  image: Image;
  name: string;
  thumbnailImage?: Image;
  vsStageId?: number;
}

export interface Weapon {
  image: Image;
  name: string;
}

export interface Image {
  url: string;
}
