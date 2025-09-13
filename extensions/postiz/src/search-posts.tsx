import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { getWeek } from "date-fns";
import { FormValidation, showFailureToast, useFetch, useForm } from "@raycast/utils";
import { buildPostizUrl, POSTIZ_HEADERS, STATE_COLORS } from "./postiz";
import { Identifier, Integration, Post } from "./types";

const generateMarkdown = (post: Post) => {
    switch (post.integration.providerIdentifier) {
        case Identifier.x:
            return post.content
            .replace(/@(\w+)/g, (match, handle) => {
                return `[${match}](https://x.com/${handle})`;
            })
            .replace(/#(\w+)/g, (match, hashtag) => {
                return `[${match}](https://x.com/hashtag/${hashtag})`;
            });
        default:
            return post.content;
    }
}

export default function SearchPosts() {
    const date = useMemo(() => new Date(), []);
    const {isLoading, data: posts, revalidate} = useFetch(buildPostizUrl("posts", {
        display: "week",
        day: date.getDay().toString(),
        week: getWeek(date).toString(),
        month: date.getMonth().toString(),
        year: date.getFullYear().toString()
    }), {
        headers: POSTIZ_HEADERS,
        mapResult(result: {posts: Post[]}) {
            return {data:result.posts};
        },
        initialData: []
    });

    return <List isLoading={isLoading} isShowingDetail>
        {posts.map(post => <List.Item key={post.id} icon={post.integration.picture} title={post.id} detail={<List.Item.Detail markdown={generateMarkdown(post)} metadata={<List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Provider" text={post.integration.providerIdentifier} />
            <List.Item.Detail.Metadata.TagList title="State">
                <List.Item.Detail.Metadata.TagList.Item text={post.state} color={STATE_COLORS[post.state]} />
            </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Create Post" target={<CreatePost />} onPop={revalidate} />
        </ActionPanel>} />)}
    </List>
}

function CreatePost() {
    const {pop} = useNavigation();
    const {isLoading, data: channels} = useFetch<Integration[], Integration[]>(buildPostizUrl("integrations"), {
        headers: POSTIZ_HEADERS,
        initialData: []
    });
type FormValues = {
    type: string;
    integrationId: string;
    content: string;
}
    const {handleSubmit,itemProps} = useForm<FormValues>({
        async onSubmit(values) {
            try {
                const body = {
                        type: values.type,
                        date: new Date().toISOString(),
                        tags: [],
                        shortLink: false,
                        posts: [
                            {
                                integration: {
                                    id: values.integrationId
                                },
                                value: [
                                    {
                                        content: values.content
                                    }
                                ]
                            }
                        ]
                    }
                const response = await fetch(buildPostizUrl("posts"), {
                    method: "POST",
                    headers: POSTIZ_HEADERS,
                    body: JSON.stringify(body)
                });
                const result = await response.json();
                if (!response.ok) {
                    const err = result as {error?: string; message: string[] | string};
                    throw new Error(Array.isArray(err.message) ? err.message[0] : err.message);
                }
                pop();
            } catch (error) {
                await showFailureToast(error)
            }
        },
        validation: {
            type: FormValidation.Required,
            integrationId: FormValidation.Required,
            content: FormValidation.Required
        }
    })
    return <Form isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="draft" value="draft" />
    </Form.Dropdown>
    <Form.Dropdown title="Channel" {...itemProps.integrationId}>
        {channels.map(channel => <Form.Dropdown.Item key={channel.id} icon={channel.picture} title={channel.profile} value={channel.id} />)}
    </Form.Dropdown>
    <Form.TextArea title="Content" {...itemProps.content} />
    </Form>
}