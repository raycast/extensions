
import { useState } from "react";
import { ActionPanel, Action, Form, LocalStorage, environment, closeMainWindow } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

// check the available memory

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


export default function Command() {

    const [templateType, setTemplateType] = useState<string>("folder");
    
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Create template" onSubmit={async (values) => {
                        const folder = values["folder"] as string;
                        const templateType = values["templateType"] as string;
                        const command = values["command"] as string;
                        const outputFolder = values["outputFolder"] as string;
                        const templateName = values["templateName"] as string;
                        let templates = await LocalStorage.getItem<string>("templates");
                        if (templates == null || templates == undefined) {
                            templates = "[]";
                            await LocalStorage.setItem("templates", templates);
                        }
                        const arr = JSON.parse(templates);
                        arr.push({ name: templateName, folder: folder[0], outputFolder: outputFolder[0], command, templateType, id: arr.length + 1 });
                        const templatePath = environment.supportPath + "/templates/" + templateName;
                        copyFolderSync(folder[0], templatePath);
                        await LocalStorage.setItem("templates", JSON.stringify(arr));
                        //await showToast({ title: "Template created", message: `${templateName} template has been created`, style: Toast.Style.Success });
                        exec('code .', {
                            cwd: templatePath
                        }, function (error) {
                            // work with result
                            console.log(error);
                        });
                        await closeMainWindow({ clearRootSearch: true });
                    }} />
                </ActionPanel>
            }
        >
            <Form.TextField id="templateName" title="Name" defaultValue="" />
            <Form.Dropdown id="templateType" title="Create from" defaultValue="folder" value={templateType}
                onChange={setTemplateType}>
                <Form.Dropdown.Item value="folder" title="Folder" icon="📁" />
                <Form.Dropdown.Item value="command" title="CLI command" icon="🤖" />
            </Form.Dropdown>
            {templateType == "folder" ? (
                <Form.FilePicker id="folder" title="Folder" canChooseFiles={false} canChooseDirectories={true} allowMultipleSelection={false} />
            ) : (
                <Form.TextField id="command" title="Command" defaultValue="" />
            )}
            <Form.FilePicker id="outputFolder" title="Output Folder" canChooseFiles={false} canChooseDirectories={true} allowMultipleSelection={false} />
        </Form>
    );
}
