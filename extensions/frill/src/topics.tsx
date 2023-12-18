import { useEffect, useState } from "react";
import { createTopic, deleteTopic, getTopics, updateTopic } from "./api";
import { Action, ActionPanel, Alert, Color, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, useForm } from "@raycast/utils";
import { ErrorResponse } from "./types";
import { CreateTopicRequest, GetTopicsResponse, Topic, UpdateTopicRequest } from "./types/topics";

export default function Topics() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [topicsResponse, setTopicsResponse] = useState<GetTopicsResponse>();

    async function getTopicsFromApi() {
        setIsLoading(true);
        const response = await getTopics();
        if ("data" in response) {
            setTopicsResponse(response)
            await showToast({
                title: "SUCCESS",
                message: `Fetched ${response.data.length} topics`
            })
        } else setError(response.message);
        setIsLoading(false);
    }

    useEffect(() => {
        getTopicsFromApi();
    }, [])

    async function confirmAndDeleteTopic(topic: Topic) {
        if (
          await confirmAlert({
            title: `Delete topic '${topic.name}'?`,
            message: "This action cannot be undone.",
            icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
            setIsLoading(true);
          const response = await deleteTopic(topic.idx);
          if ("success" in response) {
            await showToast(Toast.Style.Success, "SUCCESS", `Deleted topic '${topic.name}`);
            await getTopicsFromApi();
          }
        }
      }

    return error ? <ErrorComponent error={error} /> : <List isLoading={isLoading} isShowingDetail>
        {topicsResponse?.data.map(topic => <List.Item key={topic.idx} title={topic.name} icon={{ source: Icon.Hashtag, tintColor: topic.is_private ? Color.Purple : Color.Green }} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="IDx" text={topic.idx} />
            <List.Item.Detail.Metadata.Label title="Name" text={topic.name} />
            <List.Item.Detail.Metadata.Label title="Created At" text={topic.created_at || ""} icon={topic.created_at ? undefined : Icon.Minus} />
            <List.Item.Detail.Metadata.Label title="Updated At" text={topic.updated_at || ""} icon={topic.updated_at ? undefined : Icon.Minus} />
            <List.Item.Detail.Metadata.Label title="Is Private" icon={topic.is_private ? Icon.Check : Icon.Multiply} />
            <List.Item.Detail.Metadata.Label title="Order" text={topic.order.toString()} />
        </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
            <Action.Push title="Update Topic" icon={Icon.Pencil} target={<UpdateTopic initialTopic={topic} onTopicUpdated={getTopicsFromApi} />} />
            <Action title="Delete Topic" style={Action.Style.Destructive} icon={Icon.DeleteDocument} onAction={() => confirmAndDeleteTopic(topic)} />
            <ActionPanel.Section>
                <Action.Push title="Create New Topic" icon={Icon.Plus} target={<CreateNewTopic onTopicCreated={getTopicsFromApi} />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Create New Topic" icon={Icon.Plus} actions={<ActionPanel>
                <Action.Push title="Create New Topic" icon={Icon.Plus} target={<CreateNewTopic onTopicCreated={getTopicsFromApi} />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            </ActionPanel>} />
        </List.Section>}
    </List>      
}

type CreateNewTopicProps = {
    onTopicCreated: () => void;
}
export function CreateNewTopic({ onTopicCreated }: CreateNewTopicProps) {
    const { pop } = useNavigation();

    const [isLoading, setIsLoading] = useState(false);
    const [errorResponse, setErrorResponse] = useState<ErrorResponse>();
    
    const { handleSubmit, itemProps } = useForm<CreateTopicRequest>({
        async onSubmit(values) {
            setIsLoading(true);
          const params = values;
          
          const response = await createTopic(params);
    
          if ("data" in response) {
            await showToast(Toast.Style.Success, "SUCCESS", "Created Topic");
            onTopicCreated();
            pop();
          } else setErrorResponse(response);
        },
        validation: {
          name: FormValidation.Required,
        },
      });

      return errorResponse ? <ErrorComponent response={errorResponse} /> : <Form isLoading={isLoading} navigationTitle="Create Topic" actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
      </ActionPanel>}>
        <Form.TextField title="Name" placeholder="New Topic" {...itemProps.name} />
      </Form>
}

type UpdateTopicProps = {
    initialTopic: Topic;
    onTopicUpdated: () => void;
}
export function UpdateTopic({ initialTopic, onTopicUpdated }: UpdateTopicProps) {
    const { pop } = useNavigation();

    const [isLoading, setIsLoading] = useState(false);
    const [errorResponse, setErrorResponse] = useState<ErrorResponse>();
    
    const { handleSubmit, itemProps } = useForm<UpdateTopicRequest>({
        async onSubmit(values) {
            setIsLoading(true);
          const params = values;
          
          const response = await updateTopic(initialTopic.idx, params);
    
          if ("data" in response) {
            await showToast(Toast.Style.Success, "SUCCESS", "Updated Topic");
            onTopicUpdated();
            pop();
          } else setErrorResponse(response);
        },
        validation: {
          name: FormValidation.Required
        },
        initialValues: {
            name: initialTopic.name,
        }
      });

      return errorResponse ? <ErrorComponent response={errorResponse} /> : <Form isLoading={isLoading} navigationTitle="Update Topic" actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
      </ActionPanel>}>
        <Form.TextField title="Name" placeholder="Updated Topic" {...itemProps.name} />
      </Form>
}