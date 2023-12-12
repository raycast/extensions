import { Fragment, useEffect, useState } from "react";
import { createAnnouncement, deleteAnnouncement, getAnnouncements, getIdeas, updateAnnouncement } from "./api";
import { Announcement, AnnouncementContentObject, CreateAnnouncementRequest, CreateNewAnnouncementFormValues, GetAnnouncementsResponse, Idea, ImageAnnouncementContentObject, UpdateAnnouncementFormValues, UpdateAnnouncementRequest } from "./types";
import { Action, ActionPanel, Alert, Color, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, useForm } from "@raycast/utils";
import { generateAnnouncementMarkdown } from "./functions";

export default function Announcements() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [announcementsResponse, setAnnouncementsResponse] = useState<GetAnnouncementsResponse>();

    async function getAnnouncementsFromApi() {
        setIsLoading(true);
        const response = await getAnnouncements();
        if ("data" in response) {
            setAnnouncementsResponse(response)
            await showToast({
                title: "SUCCESS",
                message: `Fetched ${response.data.length} announcements`
            })
        } else setError(response.message);
        setIsLoading(false);
    }

    useEffect(() => {
        getAnnouncementsFromApi();
    }, [])

    async function confirmAndDeleteAnnouncement(announcement: Announcement) {
        if (
          await confirmAlert({
            title: `Delete announcement '${announcement.name}'?`,
            message: "This action cannot be undone.",
            icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          const response = await deleteAnnouncement(announcement.idx);
          if ("success" in response) {
            await showToast(Toast.Style.Success, "SUCCESS", response.message);
            await getAnnouncementsFromApi();
          }
        }
      }
    

    return error ? <ErrorComponent error={error} /> : <List isLoading={isLoading} isShowingDetail>
        {announcementsResponse?.data.map(announcement => <List.Item key={announcement.idx} title={announcement.name} icon={{ source: Icon.Megaphone, tintColor: announcement.is_published ? Color.Green : Color.Red }} detail={<List.Item.Detail markdown={generateAnnouncementMarkdown(announcement.content)} metadata={<List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="ID" text={announcement.idx} />
            <List.Item.Detail.Metadata.Label title="Name" text={announcement.name} />
            <List.Item.Detail.Metadata.Link title="slug" text={announcement.slug} target={announcement.slug} />
            <List.Item.Detail.Metadata.Label title="Excerpt" text={announcement.excerpt} />
            {/* content */}
            <List.Item.Detail.Metadata.TagList title="Reaction Count">
                {Object.entries(announcement.reaction_count).map(([reaction, count]) => <List.Item.Detail.Metadata.TagList.Item key={reaction} text={`${reaction}: ${count}`} />)}
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Label title="Published" icon={{ source: announcement.is_published ? Icon.Check : Icon.Multiply, tintColor: announcement.is_published ? Color.Green : Color.Red }} />
            <List.Item.Detail.Metadata.Label title="Published At" text={announcement.published_at || ""} icon={announcement.published_at ? undefined : Icon.Minus} />
            <List.Item.Detail.Metadata.Label title="Created At" text={announcement.created_at || ""} icon={announcement.created_at ? undefined : Icon.Minus} />
            <List.Item.Detail.Metadata.Label title="Updated At" text={announcement.updated_at || ""} icon={announcement.updated_at ? undefined : Icon.Minus} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="AUTHOR" />
            <List.Item.Detail.Metadata.Label title="---" />
            <List.Item.Detail.Metadata.Label title="Author Name" text={announcement.author.name} />
            <List.Item.Detail.Metadata.Link title="Author Email" text={announcement.author.email} target={`mailto:${announcement.author.email}`} />
            <List.Item.Detail.Metadata.Label title="Author Avatar" icon={announcement.author.avatar} />
            <List.Item.Detail.Metadata.Label title="Author Created At" text={announcement.author.created_at} />
            <List.Item.Detail.Metadata.Label title="Author Updated At" text={announcement.author.updated_at} />
            <List.Item.Detail.Metadata.Label title="Author ID" text={announcement.author.idx} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="CATEGORIES" />
            <List.Item.Detail.Metadata.Label title="---" />
            {announcement.categories.map(category => <Fragment key={category.idx}>
                <List.Item.Detail.Metadata.Label title="Name" text={category.name} />
                <List.Item.Detail.Metadata.Label title="Color" text={category.color} />
                <List.Item.Detail.Metadata.Label title="Created At" text={category.created_at} />
                <List.Item.Detail.Metadata.Label title="Updated At" text={category.updated_at} />
                <List.Item.Detail.Metadata.Label title="ID" text={category.idx} />
            </Fragment>)}
        </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
            <Action.Push title="Update Announcement" icon={Icon.Pencil} target={<UpdateAnnouncement initialAnnouncement={announcement} onAnnouncementUpdated={getAnnouncementsFromApi} />} />
            <Action title="Delete Announcement" style={Action.Style.Destructive} icon={Icon.DeleteDocument} onAction={() => confirmAndDeleteAnnouncement(announcement)} />
            <ActionPanel.Section>
                <Action.Push title="Create New Announcement" icon={Icon.Plus} target={<CreateNewAnnouncement onAnnouncementCreated={getAnnouncementsFromApi} />} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Create New Announcement" icon={Icon.Plus} actions={<ActionPanel>
                <Action.Push title="Create New Announcement" icon={Icon.Plus} target={<CreateNewAnnouncement onAnnouncementCreated={getAnnouncementsFromApi} />} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type UpdateAnnouncementProps = {
    initialAnnouncement: Announcement;
    onAnnouncementUpdated: () => void;
}
function UpdateAnnouncement({ initialAnnouncement, onAnnouncementUpdated }: UpdateAnnouncementProps) {
    const { pop } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [ideas, setIdeas] = useState<Idea[]>();

  const { handleSubmit, itemProps } = useForm<UpdateAnnouncementFormValues>({
    async onSubmit(values) {
      const params = values;
      if (!values.published_at) delete params.published_at;
      if (!values.idea_idxs) delete params.idea_idxs;
      if (!values.category_idxs) delete params.category_idxs;

      const response = await updateAnnouncement(initialAnnouncement.idx, params as UpdateAnnouncementRequest);

      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", "Updated Announcement");
        onAnnouncementUpdated();
        pop();
      }
    },
    initialValues: {
        name: initialAnnouncement.name,
        author_idx: initialAnnouncement.author.idx,
        content: generateAnnouncementMarkdown(initialAnnouncement.content),
        published_at: new Date(initialAnnouncement.published_at),
        idea_idxs: initialAnnouncement.ideas.map(idea => idea.idx),
        category_idxs: initialAnnouncement.categories.map(category => category.idx)
    },
    validation: {
      name: FormValidation.Required,
      author_idx: FormValidation.Required,
      content: FormValidation.Required
    },
  });

  async function getIdeasFromApi() {
    setIsLoading(true);
    const response = await getIdeas();
    if ("data" in response) {
        setIdeas(response.data)
        await showToast({
            title: "SUCCESS",
            message: `Fetched ${response.data.length} ideas`
        })
    }
    setIsLoading(false);
}

  useEffect(() => {
    getIdeasFromApi();
  }, [])


    return <Form navigationTitle="Update Announcement" isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Name" {...itemProps.name} info="Title of the Announcement" />
        <Form.TextField title="Author ID" {...itemProps.author_idx} info="IDX of the author of the Announcement" />
        <Form.TextArea title="Content" {...itemProps.content} info="Announcement content in Markdown format" placeholder={`# Idea Title
        
lorem ipsum`} />
        <Form.DatePicker title="Published At" type={Form.DatePicker.Type.Date} {...itemProps.published_at} />
        <Form.TagPicker title="Ideas" {...itemProps.idea_idxs} placeholder="Idea # 1">
            {ideas?.map(idea => <Form.TagPicker.Item key={idea.idx} title={idea.name} value={idea.idx} />)}
        </Form.TagPicker>
        {/* TODO: category_idx */}
    </Form>
}

type CreateNewAnnouncementProps = {
    onAnnouncementCreated: () => void
}
function CreateNewAnnouncement({ onAnnouncementCreated }: CreateNewAnnouncementProps) {
    const { pop } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [ideas, setIdeas] = useState<Idea[]>();

  const { handleSubmit, itemProps } = useForm<CreateNewAnnouncementFormValues>({
    async onSubmit(values) {
      const params = values;
      if (!values.published_at) delete params.published_at;
      if (!values.idea_idxs) delete params.idea_idxs;
      if (!values.category_idxs) delete params.category_idxs;

      const response = await createAnnouncement(params as CreateAnnouncementRequest);

      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", "Created Announcement");
        onAnnouncementCreated();
        pop();
      }
    },
    validation: {
      name: FormValidation.Required,
      author_idx: FormValidation.Required,
      content: FormValidation.Required
    },
  });

  async function getIdeasFromApi() {
    setIsLoading(true);
    const response = await getIdeas();
    if ("data" in response) {
        setIdeas(response.data)
        await showToast({
            title: "SUCCESS",
            message: `Fetched ${response.data.length} ideas`
        })
    }
    setIsLoading(false);
}

  useEffect(() => {
    getIdeasFromApi();
  }, [])


    return <Form navigationTitle="Create New Announcement" isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Name" {...itemProps.name} info="Title of the Announcement" />
        <Form.TextField title="Author ID" {...itemProps.author_idx} info="IDX of the author of the Announcement" />
        <Form.TextArea title="Content" {...itemProps.content} info="Announcement content in Markdown format" placeholder={`# Idea Title
        
lorem ipsum`} />
        <Form.DatePicker title="Published At" type={Form.DatePicker.Type.Date} {...itemProps.published_at} />
        <Form.TagPicker title="Ideas" {...itemProps.idea_idxs} placeholder="Idea # 1">
            {ideas?.map(idea => <Form.TagPicker.Item key={idea.idx} title={idea.name} value={idea.idx} />)}
        </Form.TagPicker>
        {/* TODO: category_idx */}
    </Form>
}