import {ActionPanel, Icon, List, OpenInBrowserAction, showToast, SubmitFormAction, ToastStyle} from "@raycast/api";
import {useEffect, useState} from "react";
import {circleCIProjectPipelines, circleCIWorkflows} from "../circleci-functions";
import {uriToLongerSlug} from "../utils";
import { Pipeline } from "../types";

interface Params {
  full_name: string;
  uri: string;
}

export const ListCircleCIProjectPipelines = ({ full_name, uri }: Params) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const load = () =>
    Promise.resolve()
      .then(() => setIsLoading(true))
      .then(() => circleCIProjectPipelines(uri))
      .then(pipelines => {
        setPipelines(pipelines);
        return pipelines;
      })
      .then(pipelines =>
        Promise
          .all(pipelines.map(({ id }) => circleCIWorkflows({ id }).then(list => list.pop())))
          .then(workflows => ({ pipelines, workflows }))
      )
      .then(({ pipelines, workflows }) => pipelines.forEach((p, i) => p.workflow = workflows[i]))
      .then(() => setIsLoading(false))
      .catch(e => showToast(ToastStyle.Failure, e.message));

  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    load();
  }, []);

  return <List isLoading={isLoading} navigationTitle={full_name}>
    {Object.entries(pipelines.reduce((acc, val) => {
      const date = new Date(val.created_at).toLocaleDateString();

      (acc[date] = acc[date] || []).push(val);

      return acc;
    }, {} as Record<string, Pipeline[]>))
      .sort(([l], [r]) => new Date(l).getTime() - new Date(r).getTime())
      .reverse()
      .map(([date, entries]) => <List.Section key={date} title={date}>
        {entries.map(item => <List.Item
          key={item.id}
          icon={iconForPipelines(item.workflow?.status || item.state)}
          accessoryIcon={item.trigger.actor.avatar_url || "gearshape-16"}
          title={item.workflow?.status || "No status"}
          subtitle={item.vcs.tag || item.vcs.branch || ""}
          accessoryTitle={item.workflow?.name || "No workflow"}
          keywords={[item.vcs.branch || item.vcs.tag || ""]}
          actions={
            <ActionPanel>
              {item.workflow && <OpenInBrowserAction
                url={`https://app.circleci.com/pipelines/${uriToLongerSlug(uri)}/${item.number}/workflows/${item.workflow.id}`}
              />}
              <SubmitFormAction
                title="Refresh"
                onSubmit={() => load()}
                icon={Icon.ArrowClockwise}
                shortcut={{key: "r", modifiers: ["cmd", "shift"]}}
              />
            </ActionPanel>
          }
        />)}
      </List.Section>)}
  </List>;
};

const iconForPipelines = (status: string | undefined) => {
  switch (status) {
    case "success":
      return "✅";
    case "failed":
      return "❌";
    case "canceled":
      return "⏹";
    case "created":
      return "🏷";
    default:
      return "😱";
  }
};
