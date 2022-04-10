import { Detail, Action, ActionPanel, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { Octokit } from "@octokit/core";
import Topic from './types/Topic'
import Home from './index'

var YamlFront = require('yaml-front-matter');

const TopicDetail = (props: { topic: Topic;}) => {
  const [mark, setMark] = useState('')
  useEffect(() => {
    const fetchDocFiles = async () => {
      const octokit = new Octokit();

      let { data } = await octokit.request(`GET /repos/vercel/next.js/contents/docs/${props.topic.path}`, {
        headers: {
          "accept": " application/vnd.github.v3.raw"
        }
      })
      const parsed = YamlFront.loadFront(data)
      setMark(parsed.__content)
    }
    fetchDocFiles()

  }, [mark, setMark])

  if(!mark) return <Detail navigationTitle={props.topic.title} isLoading />

  return <>
      <Detail navigationTitle={props.topic.title} markdown={mark} actions={
        <ActionPanel>
          <Action.Push title="Home" target={<Home></Home>} />
        </ActionPanel>
      }/>
  </>;
}

export default TopicDetail;