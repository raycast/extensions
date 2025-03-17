import { Detail, LaunchProps } from "@raycast/api";

type WubiVersion = "86" | "98" | "xsj";

type Item = {
  url: string;
  description: string;
};

const ImageMap: Record<WubiVersion, Item> = {
  "86": {
    url: "wubi86.webp",
    description: "86版五笔字型是最常用的五笔版本，字根数量少，规则简单，适合初学者",
  },
  "98": {
    url: "wubi98.webp",
    description: "98版五笔是86版的改进版本，扩展了字库，收录更多汉字",
  },
  xsj: {
    url: "wubixsj.webp",
    description: "新世纪版五笔进一步扩充了字库，支持GBK、Unicode等更多字符集",
  },
};

export default function Command(props: LaunchProps<{ arguments: Arguments.ShowRadicalTable }>) {
  const { version } = props.arguments;
  const content = `![${version}版字根表](${ImageMap[version].url})\n\n${ImageMap[version].description}`;
  return <Detail markdown={content} />;
}
