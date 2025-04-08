import { ActionPanel, Action, showToast, Toast, Form } from "@raycast/api";
import { getPreferences } from "./preferences";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { octokit, queryClient } from "./common";
import { useForm } from "@raycast/utils";
import { FormValidation } from "@raycast/utils";
import { TAGS_QUERY } from "./commands/deploy-ts-app/queries";
import { useState } from "react";
import { createVortexDeployment } from "./create-vortex-deployment";
import { App } from "./config/apps";
import { ENVIRONMENTS_BY_APP } from "./config/environments";

interface Tag {
  name: string;
  target: {
    name?: string;
    message?: string;
    tagger?: {
      name: string;
      email: string;
      date: string;
    };
    target?: {
      oid: string;
      committedDate: string;
    };
    oid?: string;
    committedDate?: string;
  };
}

function _Command() {
  const { owner, repo } = getPreferences();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<{
    tag: string;
    environments: string[];
    app: string;
  }>({
    onSubmit(values) {
      setIsLoading(true);
      createVortexDeployment({
        tag: values.tag,
        app: values.app as App,
        environments: values.environments,
      }).then(() => {
        setIsLoading(false);
      });
    },
    validation: {
      tag: FormValidation.Required,
      environments: FormValidation.Required,
      app: FormValidation.Required,
    },
  });

  const tagsQuery = useQuery({
    queryKey: ["tags", owner, repo],
    async queryFn() {
      try {
        const result = await octokit.graphql<{
          repository: { refs: { edges: { node: Tag }[] } };
        }>(TAGS_QUERY, {
          owner,
          repo,
          count: 100,
        });

        return result.repository.refs.edges.map((edge) => edge.node);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch tags",
          message: String(error),
        });
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="App" {...itemProps.app}>
        <Form.Dropdown.Item value={App.LeChat} title="Le Chat" icon="😺" />
        <Form.Dropdown.Item
          value={App.LaConsole}
          title="La Console"
          icon="🎮"
        />
        <Form.Dropdown.Item
          value={App.SettingsManager}
          title="Settings Manager"
          icon="🔧"
        />
        <Form.Dropdown.Item value={App.Editorial} title="Editorial" icon="🔬" />
      </Form.Dropdown>

      <Form.TagPicker title="Environment" {...itemProps.environments}>
        {values.app &&
          ENVIRONMENTS_BY_APP[values.app as App].map((environment) => (
            <Form.TagPicker.Item
              key={environment.id}
              value={environment.id}
              title={environment.id}
              icon={environment.icon}
            />
          ))}
      </Form.TagPicker>

      <Form.Dropdown title="Tag" {...itemProps.tag}>
        {tagsQuery.data
          ?.filter((tag) => tag.name.includes(values.app))
          .map((tag) => (
            <Form.Dropdown.Item
              key={tag.name}
              value={tag.name}
              title={tag.name}
            />
          ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <_Command />
    </QueryClientProvider>
  );
}
