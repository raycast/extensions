import StoriesList from "components/StoriesList";
import { StoryType } from "models/StoryType";
import React from "react";

export default function MyStories() {
  return <StoriesList type={StoryType.USER} />;
}
