import { Icon, Image } from "@raycast/api";
import React from "react";

export type GroupByOption = "default" | "priority" | "project" | "date" | "label";

export type GroupByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: GroupByOption;
}[];

export type GroupByProp = {
  value: GroupByOption;
  setValue: React.Dispatch<React.SetStateAction<GroupByOption>>;
  options: GroupByOptions;
};

export const todayGroupByOptions: GroupByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Priority", icon: Icon.LevelMeter, value: "priority" },
  { label: "Project", icon: Icon.List, value: "project" },
  { label: "Label", icon: Icon.Tag, value: "label" },
];

export const projectGroupByOptions: GroupByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Priority", icon: Icon.LevelMeter, value: "priority" },
  { label: "Date", icon: Icon.Calendar, value: "date" },
  { label: "Label", icon: Icon.Tag, value: "label" },
];
