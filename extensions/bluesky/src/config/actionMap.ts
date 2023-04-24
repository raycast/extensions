import { Color, Icon } from "@raycast/api";
import {
  Follow,
  LikePost,
  Mute,
  OpenUserLikes,
  OpenUserProfile,
  QuotePost,
  ReplyPost,
  Repost,
  SwitchToHomeAction,
  Unfollow,
  UnlikePost,
  Unmute,
  ViewAsGrid,
  ViewAsList,
} from "../utils/constants";

import { ActionsDictionary } from "../types/types";

export const ActionMap: ActionsDictionary = {
  aboutView: {
    getTitle: () => "About",
    icon: Icon.Cd,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "5" },
  },
  homeView: {
    getTitle: () => "Home",
    icon: Icon.House,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "h" },
  },
  timelineView: {
    getTitle: () => "Timeline",
    icon: Icon.AppWindowList,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "1" },
  },
  newPostView: {
    getTitle: () => "New Post",
    icon: Icon.Bubble,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "3" },
  },
  searchView: {
    getTitle: () => "Search",
    icon: Icon.MagnifyingGlass,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "2" },
  },
  recentPostsView: {
    getTitle: () => "Recent Posts",
    icon: Icon.Person,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "4" },
  },
  follow: {
    getTitle: () => Follow,
    icon: Icon.AddPerson,
    color: Color.Green,
    shortcut: { modifiers: ["cmd", "shift"], key: "f" },
  },
  unfollow: {
    getTitle: () => Unfollow,
    icon: Icon.RemovePerson,
    color: Color.Red,
    shortcut: { modifiers: ["cmd", "shift"], key: "u" },
  },
  mute: {
    getTitle: () => Mute,
    icon: Icon.SpeakerOff,
    color: Color.Red,
    shortcut: { modifiers: ["cmd", "shift"], key: "m" },
  },
  unmute: {
    getTitle: () => Unmute,
    icon: Icon.SpeakerHigh,
    color: Color.Green,
    shortcut: { modifiers: ["cmd", "shift"], key: "n" },
  },
  viewAsList: {
    getTitle: () => ViewAsList,
    icon: Icon.AppWindowList,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd", "shift"], key: "g" },
  },
  viewAsGrid: {
    getTitle: () => ViewAsGrid,
    icon: Icon.AppWindowGrid3x3,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd", "shift"], key: "g" },
  },
  like: {
    getTitle: () => LikePost,
    icon: Icon.Heart,
    color: Color.Green,
    shortcut: { modifiers: ["ctrl"], key: "l" },
  },
  unlike: {
    getTitle: () => UnlikePost,
    color: Color.Red,
    icon: Icon.HeartDisabled,
    shortcut: { modifiers: ["ctrl"], key: "u" },
  },
  repost: {
    getTitle: () => Repost,
    icon: Icon.Repeat,
    color: Color.Blue,
    shortcut: { modifiers: ["ctrl"], key: "r" },
  },
  reply: {
    getTitle: () => ReplyPost,
    icon: Icon.Reply,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd", "shift"], key: "r" },
  },
  quote: {
    getTitle: () => QuotePost,
    icon: Icon.QuotationMarks,
    color: Color.Blue,
    shortcut: { modifiers: ["ctrl"], key: "q" },
  },
  switchToHomeView: {
    getTitle: () => SwitchToHomeAction,
    icon: Icon.House,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "h" },
  },
  openProfile: {
    getTitle: () => OpenUserProfile,
    icon: Icon.Person,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd"], key: "return" },
  },
  openUserLikes: {
    getTitle: () => OpenUserLikes,
    icon: Icon.Heartbeat,
    color: Color.Blue,
    shortcut: { modifiers: ["cmd", "ctrl"], key: "l" },
  },
};
