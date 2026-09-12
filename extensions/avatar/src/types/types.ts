import { defaultSeed } from "../utils/constants";

export interface AvatarOptions {
  style: string;
  seed: string;
  flip: boolean;
  rotate: number; //0~360
  scale: number; //default:100, 0~200
  radius: number; //0~50
  translateX: number; //-100~100
  translateY: number; //-100~100
  backgroundColor: string;
}

export const avatarInit: AvatarOptions = {
  style: "adventurer",
  seed: defaultSeed,
  flip: false,
  rotate: 0, //0~360
  scale: 100, //default:100, 0~200
  radius: 0, //0~50
  translateX: 0, //-100~100
  translateY: 0, //-100~100
  backgroundColor: "#ffffff",
};

export interface AvatarInfo {
  svgCode: string;
  markdownImage: string;
  png: string;
  svg: string;
}
export const avatarInfoInit = { svgCode: "", markdownImage: "", png: "", svg: "" };
