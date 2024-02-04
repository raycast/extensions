import { useState, useEffect } from "react";
import { ActionPanel, Action, closeMainWindow, List } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { exec } from "child_process";


// check the available memory

type Template = { name: string, folder: string, outputFolder: string, command: string, templateType: string, id: number };

export default function Command() {
    const [isLoading, setIsLoading] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);

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
                            <Action title="Open template" onAction={async () => {
                                exec('code .', {
                                    cwd: template.folder as string
                                }, function (error) {
                                    console.log(error);
                                });
                                await closeMainWindow({ clearRootSearch: true });
                            }} />
                            <Action title="Delete" onAction={() => {
                                const arr = templates.filter((t) => t.id != template.id);
                                LocalStorage.setItem("templates", JSON.stringify(arr));
                                setTemplates(arr);
                            }} />
                        </ActionPanel>
                    }
                />
            )}

        </List>
    );
};
