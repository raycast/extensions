import { Detail, LaunchProps } from "@raycast/api";

type WubiVersion = "86" | "98" | "xsj";

type Item = {
  url: string;
  description: string;
};

const ImageMap: Record<WubiVersion, Item> = {
  "86": {
    url: "wubi86.webp",
    description:
      "Wubi 86 is the most commonly used Wubi version, with fewer radicals and simpler rules, suitable for beginners",
  },
  "98": {
    url: "wubi98.webp",
    description:
      "Wubi 98 is an improved version of Wubi 86, with an expanded character library and more Chinese characters",
  },
  xsj: {
    url: "wubixsj.webp",
    description:
      "New Century Wubi further expands the character library, supporting more character sets like GBK and Unicode",
  },
};

export default function Command(props: LaunchProps<{ arguments: Arguments.ShowRadicalTable }>) {
  const { version } = props.arguments;
  const content = `![Wubi ${version} Radical Table](${ImageMap[version].url})\n\n${ImageMap[version].description}`;
  return <Detail markdown={content} />;
}
