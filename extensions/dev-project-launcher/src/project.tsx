import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { statSync } from "fs";
import { readFile, readdir } from "fs/promises";
import { useEffect, useState } from "react";
import Configuration from "./configuration";
import { useIdes } from "./ide";
import { Node, getNodeType, retrieveNodesSync } from "./node";
import { Language, OTHER, getLanguages } from "./programmingLanguages";

const KB = 1000;

const Languages = ({ languages }: { languages?: Language[] }) => {
  return (
    <>
      {languages?.map((language) => {
        return <Detail.Metadata.TagList.Item key={language.language} text={language.language} color={language.color} />;
      })}
    </>
  );
};

const ProjectActions = ({ absolutePath }: { absolutePath: string }) => {
  const ides = useIdes();
  return (
    <ActionPanel>
      {statSync(absolutePath).isDirectory() ? (
        <Action.Push title={"See"} target={<Projects nodes={retrieveNodesSync(absolutePath)} />} />
      ) : (
        <Action.OpenWith path={absolutePath} />
      )}
      <Action.Push
        title="Shortcuts Configuration"
        shortcut={{ modifiers: ["cmd"], key: "," }}
        target={<Configuration />}
        icon={Icon.Gear}
      />
      {ides.map((ide) => (
        <Action.Open
          key={ide.appName}
          title={`Open With ${ide.displayName}`}
          application={ide.appName}
          target={absolutePath}
          shortcut={ide.shortcut}
          icon={Icon.Code}
        />
      ))}
    </ActionPanel>
  );
};

type Description = {
  readme: string;
  languages: Language[];
};

const ProjectDetail = ({ absolutePath }: { absolutePath: string }) => {
  const contentList = (files: string[]) => {
    const filesMd = files.reduce((prev, curr) => prev + `* ${curr}\n`, "");
    return "## Content\n" + filesMd;
  };

  const [description, setDescription] = useState<Description>({
    readme: contentList([]),
    languages: [OTHER],
  });

  useEffect(() => {
    const updateDescription = async () => {
      const getReadme = async (languages: Language[]) => {
        const nodeType = getNodeType({ absolutePath: absolutePath, name: "" });

        switch (nodeType) {
          case "DIR": {
            const dirs = await readdir(absolutePath);
            try {
              const file = await readFile(absolutePath + "/README.md");
              return file.toString() || contentList(dirs);
            } catch (_) {
              return contentList(dirs);
            }
          }
          case "FILE": {
            if (statSync(absolutePath).size > 5 * KB) {
              return "### Too big to display content";
            }
            const content = await readFile(absolutePath);
            return "```" + `${languages[0].language}\n` + content + "\n" + "```";
          }
          case "IMG":
            return `![](${absolutePath})`;
          default: {
            const checkNever: never = nodeType;
            return checkNever;
          }
        }
      };
      setTimeout(async () => {
        const languages = await getLanguages(absolutePath);
        setDescription({
          readme: await getReadme(languages),
          languages,
        });
      }, 50);
    };
    updateDescription();
  }, [absolutePath]);

  return (
    <List.Item.Detail
      markdown={description.readme}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Languages">
            <Languages languages={description.languages} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
};

export default function Projects({ nodes }: { nodes: Node[] }) {
  const getIcon = (node: Node) => {
    const nodeType = getNodeType(node);
    switch (nodeType) {
      case "DIR":
        return Icon.Box;
      case "IMG":
        return Icon.Image;
      case "FILE":
        return Icon.Document;
      default: {
        const checkNever: never = nodeType;
        return checkNever;
      }
    }
  };
  return (
    <List isLoading={nodes.length === 0} isShowingDetail>
      {nodes.map((node) => {
        return (
          <List.Item
            key={node.name}
            icon={getIcon(node)}
            title={node.name}
            detail={<ProjectDetail absolutePath={node.absolutePath} />}
            actions={<ProjectActions absolutePath={node.absolutePath} />}
          />
        );
      })}
    </List>
  );
}
