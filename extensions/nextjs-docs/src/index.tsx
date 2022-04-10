import { ActionPanel, Action, List, Icon } from "@raycast/api";
import GithubOcto from "./Octokit";
import { useEffect, useState } from "react";
import type TopicType from './types/Topic'
import TopicDetail from "./TopicDetail";
import path from 'path'
import GithubTreeType from './types/GithubTree'

export default function main() {
    let [topics, setTopics] = useState<TopicType[]>()

    useEffect(() => {
        const fetchDocFiles = async () => {
            const octokit = new GithubOcto();
            let { data } = await octokit.request('GET /repos/vercel/next.js/git/trees/86651d4c4f53e8a2882e22339fb78d0aa2879562', {
                recursive: true
            })

            let results = data.tree.filter((file:GithubTreeType) => file.type == 'blob')
            .map((file: TopicType) => {
                const item:TopicType = {
                    type: '',
                    path: '',
                    sha: '',
                    name: '',
                    title: '',
                    filepath: ''
                }
                item.type = file.type
                item.path = file.path
                item.sha = file.sha

                item.name = path.parse(file.path).name;

                const finalTitle = item.name.split('-')
                    .join(" ")
                    .replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
                item.title = finalTitle

                item.filepath = path.parse(file.path).dir
                return item;
            })

            setTopics(results)
        }
        fetchDocFiles()
    }, [])

    if (!topics) {
        return <List isLoading />
    }

    return <List>
        {topics.map((topic) => (
        <List.Item
            key={topic.sha}
            icon={Icon.TextDocument}
            title={topic.title}
            actions={
                <ActionPanel>
                    <Action.Push title={`Browse ${topic.title}`}
                    target={<TopicDetail topic={topic} />}
                    />
                </ActionPanel>
            }
            accessories={[
                { text: topic.filepath, icon: Icon.Finder },
            ]}
        />
        ))}
    </List>;
}
