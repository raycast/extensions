import { Color } from "@raycast/api";

export const AppleMusicColor = "#fb556d";
export const Icons = {
  Music: {
    source: {
      light: "../assets/icons/music-light.svg",
      dark: "../assets/icons/music-dark.svg",
    },
  },
  Star: {
    source: "../assets/icons/star.svg",
    tintColor: Color.PrimaryText,
  },
  StarFilled: {
    source: "../assets/icons/star-filled.svg",
    tintColor: Color.PrimaryText,
  },
  Heart: {
    source: "../assets/icons/heart.svg",
    tintColor: Color.PrimaryText,
  },
  HeartFilled: {
    source: "../assets/icons/heart-filled.svg",
    tintColor: Color.Red,
  },
  Repeat: {
    Off: {
      source: "../assets/icons/repeat.png",
      tintColor: Color.PrimaryText,
    },
    All: {
      source: "../assets/icons/repeat.png",
      tintColor: AppleMusicColor,
    },
    One: {
      source: "../assets/icons/repeat-one.png",
      tintColor: AppleMusicColor,
    },
  },
  Album: {
    source: "../assets/icons/album-icon.svg",
    tintColor: Color.PrimaryText,
  },
  Playlist: {
    source: "../assets/icons/playlist-icon.svg",
    tintColor: Color.PrimaryText,
  },
};
