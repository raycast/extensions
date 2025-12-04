import { Fragment, useEffect, useState } from "react";
import { CreateIdeaRequest, GetIdeasResponse, Idea, UpdateIdeaRequest } from "./types/ideas";
import { createIdea, deleteIdea, getFollowers, getIdeas, getTopics, updateIdea } from "./lib/api";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import ErrorComponent from "./components/ErrorComponent";
import { FRILL_URL, IDEA_FILTERS } from "./lib/constants";
import { FormValidation, getAvatarIcon, useForm } from "@raycast/utils";
import { Author } from "./types/common";
import { Topic } from "./types/topics";
import { ErrorResponse } from "./types";

export default function Ideas() {
  const [isLoading, setIsLoading] = useState(true);
  const [ideasResponse, setIdeasResponse] = useState<GetIdeasResponse>();
  const [filter, setFilter] = useState("");
  const [filteredIdeas, filterIdeas] = useState<Idea[]>();
  const [errorResponse, setErrorResponse] = useState<ErrorResponse>();

  async function getIdeasFromApi() {
    setIsLoading(true);
    const response = await getIdeas();
    if ("data" in response) {
      setIdeasResponse(response);
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${response.data.length} ideas`,
      });
    } else setErrorResponse(response);
    setIsLoading(false);
  }

  useEffect(() => {
    getIdeasFromApi();
  }, []);

  useEffect(() => {
    (() => {
      if (!ideasResponse) return;
      filterIdeas(
        ideasResponse.data.filter((idea) => {
          if (filter === "") return idea;
          if (filter === "is_public" && !idea.is_private) return idea;
          if (idea[filter as keyof typeof idea]) return idea;
        }),
      );
    })();
  }, [ideasResponse, filter]);

  async function confirmAndDeleteIdea(idea: Idea) {
    if (
      await confirmAlert({
        title: `Delete idea '${idea.name}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteIdea(idea.idx);
      if ("success" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", `Delete idea '${idea.name}`);
        await getIdeasFromApi();
      }
    }
  }

  return errorResponse ? (
    <ErrorComponent response={errorResponse} />
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search idea"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" icon={Icon.CircleProgress100} value="" />
          <List.Dropdown.Section title="Status">
            {Object.entries(IDEA_FILTERS).map(([key, val]) => (
              <List.Dropdown.Item key={key} title={val} value={key} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredIdeas?.map((idea) => (
        <List.Item
          key={idea.idx}
          title={idea.name}
          icon={{ source: Icon.Circle, tintColor: idea.status?.color || undefined }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="IDx" text={idea.idx} />
                  <List.Item.Detail.Metadata.Label title="Name" text={idea.name} />
                  <List.Item.Detail.Metadata.Link
                    title="Slug"
                    text={idea.slug}
                    target={`${FRILL_URL}ideas/${idea.slug}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Description" text={idea.description} />
                  <List.Item.Detail.Metadata.Label title="Cover Image" icon={idea.cover_image || Icon.Minus} />
                  <List.Item.Detail.Metadata.Label title="Vote Count" text={idea.vote_count.toString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Note Count"
                    text={idea.note_count?.toString()}
                    icon={idea.note_count ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label title="Comment Count" text={idea.comment_count.toString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Is Private"
                    icon={idea.is_private ? Icon.Check : Icon.Multiply}
                  />
                  <List.Item.Detail.Metadata.Label title="Is Bug" icon={idea.is_bug ? Icon.Check : Icon.Multiply} />
                  <List.Item.Detail.Metadata.Label
                    title="Is Within Roadmap"
                    icon={idea.show_in_roadmap ? Icon.Check : Icon.Multiply}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Is Archived"
                    icon={idea.is_archived ? Icon.Check : Icon.Multiply}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Is Shortlisted"
                    icon={idea.is_shortlisted ? Icon.Check : Icon.Multiply}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Is Completed"
                    icon={idea.is_completed ? Icon.Check : Icon.Multiply}
                  />
                  <List.Item.Detail.Metadata.Label title="Approval Status" text={idea.approval_status} />
                  <List.Item.Detail.Metadata.Label
                    title="Created At"
                    text={idea.created_at || ""}
                    icon={idea.created_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Updated At"
                    text={idea.updated_at || ""}
                    icon={idea.updated_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label title="Excerpt" text={idea.excerpt} />
                  <List.Item.Detail.Metadata.Label
                    title="Is Pinned"
                    icon={idea.is_pinned ? Icon.Check : Icon.Multiply}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Created By"
                    text={idea.created_by || ""}
                    icon={idea.created_by ? undefined : Icon.Minus}
                  />

                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="AUTHOR" />
                  <List.Item.Detail.Metadata.Label title="---" />
                  <List.Item.Detail.Metadata.Label title="Author IDx" text={idea.author.idx} />
                  <List.Item.Detail.Metadata.Label title="Author Name" text={idea.author.name} />
                  <List.Item.Detail.Metadata.Link
                    title="Author Email"
                    text={idea.author.email}
                    target={`mailto:${idea.author.email}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Author Avatar" icon={idea.author.avatar} />
                  <List.Item.Detail.Metadata.Label title="Author Created At" text={idea.author.created_at} />
                  <List.Item.Detail.Metadata.Label title="Author Updated At" text={idea.author.updated_at} />

                  <List.Item.Detail.Metadata.Separator />
                  {idea.status ? (
                    <Fragment>
                      <List.Item.Detail.Metadata.Label title="STATUS" />
                      <List.Item.Detail.Metadata.Label title="---" />
                      <List.Item.Detail.Metadata.Label title="Status IDx" text={idea.status.idx} />
                      <List.Item.Detail.Metadata.Label title="Status Name" text={idea.status.name} />
                      <List.Item.Detail.Metadata.Label
                        title="Status Color"
                        text={idea.status.color}
                        icon={{ source: Icon.CircleFilled, tintColor: idea.status.color }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Status Is Completed"
                        icon={idea.status.is_completed ? Icon.Check : Icon.Multiply}
                      />
                    </Fragment>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="STATUS" icon={Icon.Minus} />
                  )}

                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="TOPICS" />
                  <List.Item.Detail.Metadata.Label title="---" />
                  {idea.topics.map((topic, topicIndex) => (
                    <Fragment key={topic.idx}>
                      {topicIndex !== 0 ? <List.Item.Detail.Metadata.Label title="-" /> : undefined}
                      <List.Item.Detail.Metadata.Label title="IDx" text={topic.idx} />
                      <List.Item.Detail.Metadata.Label title="Name" text={topic.name} />
                      <List.Item.Detail.Metadata.Label title="Order" text={topic.order.toString()} />
                    </Fragment>
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Update Idea"
                icon={Icon.Pencil}
                target={<UpdateIdea initialIdea={idea} onIdeaUpdated={getIdeasFromApi} />}
              />
              <Action
                title="Delete Idea"
                style={Action.Style.Destructive}
                icon={Icon.DeleteDocument}
                onAction={() => confirmAndDeleteIdea(idea)}
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Create New Idea"
                  icon={Icon.Plus}
                  target={<CreateNewIdea onIdeaCreated={getIdeasFromApi} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Idea"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New Idea"
                  icon={Icon.Plus}
                  target={<CreateNewIdea onIdeaCreated={getIdeasFromApi} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type CreateNewIdeaProps = {
  onIdeaCreated: () => void;
};
export function CreateNewIdea({ onIdeaCreated }: CreateNewIdeaProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [followers, setFollowers] = useState<Author[]>();
  const [topics, setTopics] = useState<Topic[]>();

  const { handleSubmit, itemProps } = useForm<CreateIdeaRequest>({
    async onSubmit(values) {
      const params = values;
      if (!values.is_private) delete params.is_private;
      if (!values.topic_idxs) delete params.topic_idxs;

      const response = await createIdea(params);

      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", "Created Idea");
        onIdeaCreated();
        pop();
      }
    },
    validation: {
      name: FormValidation.Required,
      author_idx: FormValidation.Required,
      description: FormValidation.Required,
    },
  });

  async function getFollowersAndTopicsFromApi() {
    setIsLoading(true);
    const [followersResponse, topicsResponse] = await Promise.all([
      getFollowers(),
      getTopics(),
      showToast({
        title: "PROCESSING",
        message: "Fetching Authors and Topics",
        style: Toast.Style.Animated,
      }),
    ]);
    let numofFollowers = 0;
    let numofTopics = 0;
    if ("data" in followersResponse) {
      setFollowers(followersResponse.data);
      numofFollowers = followersResponse.data.length;
    }
    if ("data" in topicsResponse) {
      setTopics(topicsResponse.data);
      numofTopics = topicsResponse.data.length;
    }
    await showToast({
      title: "SUCCESS",
      message: `Fetched ${numofFollowers} followers and ${numofTopics} topics`,
    });
    setIsLoading(false);
  }

  useEffect(() => {
    getFollowersAndTopicsFromApi();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="New Idea"
        {...itemProps.name}
        info="One sentence that summarizes your Idea"
      />
      <Form.Dropdown title="Author" {...itemProps.author_idx}>
        {followers?.map((follower) => (
          <Form.Dropdown.Item
            key={follower.idx}
            title={follower.name}
            value={follower.idx}
            icon={follower.avatar || getAvatarIcon(follower.name)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Description"
        placeholder="Description of New Idea"
        {...itemProps.description}
        info="Why your idea is useful, who would benefit and how it should work?"
      />
      <Form.Separator />
      <Form.Description text="OPTIONAL" />
      <Form.TagPicker title="Topics" {...itemProps.topic_idxs} placeholder="Topic # 1">
        {topics?.map((topic) => <Form.TagPicker.Item key={topic.idx} title={topic.name} value={topic.idx} />)}
      </Form.TagPicker>
      <Form.Checkbox label="Private" {...itemProps.is_private} />
    </Form>
  );
}

type UpdateIdeaProps = {
  initialIdea: Idea;
  onIdeaUpdated: () => void;
};
function UpdateIdea({ initialIdea, onIdeaUpdated }: UpdateIdeaProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [followers, setFollowers] = useState<Author[]>();
  const [topics, setTopics] = useState<Topic[]>();

  const { handleSubmit, itemProps } = useForm<UpdateIdeaRequest>({
    async onSubmit(values) {
      const params = values;
      if (!values.topic_idxs?.length) params.topic_idxs = [""];

      const response = await updateIdea(initialIdea.idx, params as UpdateIdeaRequest);

      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", "Updated Idea");
        onIdeaUpdated();
        pop();
      }
    },
    initialValues: {
      name: initialIdea.name,
      author_idx: initialIdea.author.idx,
      description: initialIdea.description,
      is_private: initialIdea.is_private,
      topic_idxs: initialIdea.topics.map((topic) => topic.idx),
    },
    validation: {
      name: FormValidation.Required,
      author_idx: FormValidation.Required,
      description: FormValidation.Required,
    },
  });

  async function getFollowersAndTopicsFromApi() {
    setIsLoading(true);
    const [followersResponse, topicsResponse] = await Promise.all([
      getFollowers(),
      getTopics(),
      showToast({
        title: "PROCESSING",
        message: "Fetching Authors and Topics",
        style: Toast.Style.Animated,
      }),
    ]);
    let numofFollowers = 0;
    let numofTopics = 0;
    if ("data" in followersResponse) {
      setFollowers(followersResponse.data);
      numofFollowers = followersResponse.data.length;
    }
    if ("data" in topicsResponse) {
      setTopics(topicsResponse.data);
      numofTopics = topicsResponse.data.length;
    }
    await showToast({
      title: "SUCCESS",
      message: `Fetched ${numofFollowers} followers and ${numofTopics} topics`,
    });
    setIsLoading(false);
  }

  useEffect(() => {
    getFollowersAndTopicsFromApi();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="New Idea"
        {...itemProps.name}
        info="One sentence that summarizes your Idea"
      />
      <Form.Dropdown title="Author" {...itemProps.author_idx}>
        {followers?.map((follower) => (
          <Form.Dropdown.Item
            key={follower.idx}
            title={follower.name}
            value={follower.idx}
            icon={follower.avatar || getAvatarIcon(follower.name)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Description"
        placeholder="Description of New Idea"
        {...itemProps.description}
        info="Why your idea is useful, who would benefit and how it should work?"
      />
      <Form.Separator />
      <Form.Description text="OPTIONAL" />
      <Form.TagPicker title="Topics" {...itemProps.topic_idxs} placeholder="Topic # 1">
        {topics?.map((topic) => <Form.TagPicker.Item key={topic.idx} title={topic.name} value={topic.idx} />)}
      </Form.TagPicker>
      <Form.Checkbox label="Private" {...itemProps.is_private} />
    </Form>
  );
}
