import { Action, ActionPanel, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";

function getContent(filename: string) {
  const content = fs.readFileSync(filename, "utf-8");
  return content;
}

function readWithFolder(rootPath: string, excludeRegexps: RegExp[]) {
  const result: string[] = [];

  function getMd(path: string) {
    const files = fs.readdirSync(path, "utf-8");
    // 过滤只保留文件夹和md文件
    files.forEach((file) => {
      // 判断是否是文件夹
      const stats = fs.statSync(path + file);
      const isDir = stats.isDirectory() && !file.startsWith(".");
      const isMd = file.endsWith(".md");
      const isExclude = excludeRegexps.some((regexp) => regexp.test(path + file));
      if (isMd && !isExclude) {
        result.push(path + file);
      }

      if (isDir) {
        getMd(path + file + "/");
      }
    });
  }

  getMd(rootPath);

  return result;
}

interface IProps {
  query: string;
}

interface IFile {
  filename: string;
  title: string;
  subTitle: string;
  content: string;
  pathname: string;
}

interface Preferences {
  /** 文件目录集合 */
  MarkdownFolder: string;
  /** 排除文件正则 */
  excludeFileRegexp?: string;
}

export default function Command(props: LaunchProps<{ arguments: IProps }>) {
  const { query } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const [list, setList] = useState<IFile[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const { MarkdownFolder: foldersText, excludeFileRegexp = "" } = preferences;
    const folders = foldersText.split(",");

    const files: string[] = [];
    folders.map((folder) => {
      files.push(
        ...readWithFolder(
          folder.trim(),
          excludeFileRegexp
            .split(",")
            .filter(Boolean)
            .map((regexp: string) => new RegExp(regexp.trim()))
        )
      );
    });
    const findList: IFile[] = [];
    [...files].forEach((filename) => {
      const _content = getContent(filename);
      // 获取内容的第一行
      const _title = _content.split("\n")[0].replace(/#/g, "").trim();
      const findIndex = _content.indexOf(query);
      const match = findIndex > -1 || _title.indexOf(query) > -1 || filename.indexOf(query) > -1;
      if (match) {
        let name = filename;
        folders.forEach((folder) => {
          name = name.replace(folder, "");
        });
        name = name.replace(".md", "").trim();

        const nameArr = name.split("/");
        name = nameArr[nameArr.length - 1];

        const _subTitle = _content
          .replace(/\n/g, "")
          .trim()
          .substring(findIndex > -1 ? (findIndex - 20 > -1 ? findIndex - 20 : 0) : 0, 200);

        findList.push({
          title: _title,
          subTitle: _subTitle,
          content: _content,
          filename: name,
          pathname: filename,
        });
      }
    });
    setList([...findList]);
  }, []);

  return (
    <List isShowingDetail={showDetail}>
      {list?.map((item) => {
        const props: Partial<List.Item.Props> = showDetail
          ? {
              detail: <List.Item.Detail markdown={`${item.content}`} />,
            }
          : {
              accessories: [
                {
                  text: "Command",
                },
              ],
            };

        return (
          <List.Item
            key={item.title}
            title={item.filename + " -- " + item.title}
            subtitle={item.subTitle}
            {...props}
            actions={
              <ActionPanel>
                <Action title={item.title} onAction={() => setShowDetail(!showDetail)} />
                <Action.Open title={`Open File`} target={item.pathname} />
                <Action.Open title={`Open File With Typora`} target={item.pathname} application={"Typora"} />
                <Action.Open
                  title={`Open File Visual Studio Code`}
                  target={item.pathname}
                  application={"Visual Studio Code"}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
