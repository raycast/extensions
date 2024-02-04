import { useState, useEffect } from "react";
import {
  ActionPanel, Action, List, useNavigation, Form, environment, closeMainWindow
} from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

// check the available memory

type Template = { name: string, folder: string, outputFolder: string, command: string, templateType: string, id: number };

function copyFolderSync(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

// check the available memory

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  const { push } = useNavigation();

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      let templates = await LocalStorage.getItem<string>("templates");
      if (templates == null || templates == undefined) {
        templates = "[]";
        await LocalStorage.setItem("templates", templates);
        setTemplates([]);
      } else {
        setTemplates(JSON.parse(templates));
      }
      
      setIsLoading(false);
    };
    fetchTemplates();
  }, []);

  return (
    <List
      isLoading={isLoading}
    >
      {templates.map(template =>
        <List.Item
          key={template.id}
          title={template.name ?? "No name"}
          actions={
            <ActionPanel title="#1 in raycast/extensions">
              <Action title="Select template" onAction={() => push(<CreateForm data={template} />)} />
            </ActionPanel>
          }
        />
      )}

    </List>
  );
};

function CreateForm(data: { data: Template }) {

  const template = data.data;

  console.log(data)

  return (
    <Form actions={
      <ActionPanel>
        <Action.SubmitForm title="New Project" onSubmit={async (values) => {
          const projectName = values["projectName"] as string;
          const folder = values["folder"] as string;
          if (template.templateType == "folder") {
            
            const templatePath = environment.supportPath + "/templates/" + template.name;
            const outputPath = folder + "/" + projectName;
            copyFolderSync(templatePath, outputPath);
            exec('code .', {
              cwd: outputPath
            }, function (error) {
              // work with result
              console.log(error);
            });
            await closeMainWindow({ clearRootSearch: true });
          } else {
            const command = values["command"] as string;
            const outputPath = folder + "/" + projectName;
            fs.mkdirSync(outputPath, { recursive: true });
            exec(command, {
              cwd: outputPath
            }, function (error) {
              // work with result
              console.log(error);
            });
            exec('code .', {
              cwd: outputPath
            }, function (error) {
              // work with result
              console.log(error);
            });
            await closeMainWindow({ clearRootSearch: true });
          }
        }} />
      </ActionPanel>
    }>
      <Form.TextField id="projectName" title="Project Name" defaultValue="" />
      <Form.FilePicker id="folder" defaultValue={[template.outputFolder]} title="Project Directory" canChooseFiles={false} canChooseDirectories={true} allowMultipleSelection={false} />
    </Form>
  );
}
