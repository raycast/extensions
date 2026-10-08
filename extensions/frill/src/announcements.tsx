import { Fragment, useEffect, useState } from "react";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAdmins,
  getAnnouncementCategories,
  getAnnouncements,
  getIdeas,
  updateAnnouncement,
} from "./lib/api";
import {
  Announcement,
  CreateAnnouncementRequest,
  CreateOrUpdateAnnouncementFormValues,
  GetAnnouncementsResponse,
  UpdateAnnouncementRequest,
} from "./types/announcements";
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
import { FormValidation, getAvatarIcon, useForm } from "@raycast/utils";
import { AnnouncementCategory } from "./types/announcement-categories";
import { Author } from "./types/common";
import { Idea } from "./types/ideas";
import { FRILL_URL } from "./lib/constants";
import { ErrorResponse } from "./types";

export default function Announcements() {
  const [isLoading, setIsLoading] = useState(true);
  const [announcementsResponse, setAnnouncementsResponse] = useState<GetAnnouncementsResponse>();
  const [filter, setFilter] = useState("");
  const [filteredAnnouncements, filterAnnouncements] = useState<Announcement[]>();
  const [errorResponse, setErrorResponse] = useState<ErrorResponse>();

  async function getAnnouncementsFromApi() {
    setIsLoading(true);
    const response = await getAnnouncements();
    if ("data" in response) {
      setAnnouncementsResponse(response);
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${response.data.length} announcements`,
      });
    } else setErrorResponse(response);
    setIsLoading(false);
  }

  useEffect(() => {
    getAnnouncementsFromApi();
  }, []);

  useEffect(() => {
    (() => {
      if (!announcementsResponse) return;
      filterAnnouncements(
        announcementsResponse.data.filter((announcement) => {
          if (filter === "") return announcement;
          if (filter === "is_published" && announcement.is_published) return announcement;
          if (filter === "is_unpublished" && !announcement.is_published) return announcement;
        }),
      );
    })();
  }, [announcementsResponse, filter]);

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

  return errorResponse ? (
    <ErrorComponent response={errorResponse} />
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search announcement"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" icon={Icon.CircleProgress100} value="" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item
              title="Published"
              icon={{ source: Icon.Megaphone, tintColor: Color.Green }}
              value="is_published"
            />
            <List.Dropdown.Item
              title="Unpublished"
              icon={{ source: Icon.Megaphone, tintColor: Color.Red }}
              value="is_unpublished"
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredAnnouncements?.map((announcement) => (
        <List.Item
          key={announcement.idx}
          title={announcement.name}
          icon={{ source: Icon.Megaphone, tintColor: announcement.is_published ? Color.Green : Color.Red }}
          detail={
            <List.Item.Detail
              markdown={announcement.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={announcement.idx} />
                  <List.Item.Detail.Metadata.Label title="Name" text={announcement.name} />
                  <List.Item.Detail.Metadata.Link
                    title="Slug"
                    text={announcement.slug}
                    target={`${FRILL_URL}announcements/${announcement.slug}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Excerpt" text={announcement.excerpt} />
                  {announcement.reaction_count ? (
                    <List.Item.Detail.Metadata.TagList title="Reaction Count">
                      {Object.entries(announcement.reaction_count).map(([reaction, count]) => (
                        <List.Item.Detail.Metadata.TagList.Item key={reaction} text={`${reaction}: ${count}`} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Reaction Count" icon={Icon.Minus} />
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Published"
                    icon={{
                      source: announcement.is_published ? Icon.Check : Icon.Multiply,
                      tintColor: announcement.is_published ? Color.Green : Color.Red,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Published At"
                    text={announcement.published_at || ""}
                    icon={announcement.published_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Created At"
                    text={announcement.created_at || ""}
                    icon={announcement.created_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Updated At"
                    text={announcement.updated_at || ""}
                    icon={announcement.updated_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="AUTHOR" />
                  <List.Item.Detail.Metadata.Label title="---" />
                  <List.Item.Detail.Metadata.Label title="Author ID" text={announcement.author.idx} />
                  <List.Item.Detail.Metadata.Label title="Author Name" text={announcement.author.name} />
                  <List.Item.Detail.Metadata.Link
                    title="Author Email"
                    text={announcement.author.email}
                    target={`mailto:${announcement.author.email}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Author Avatar" icon={announcement.author.avatar} />
                  <List.Item.Detail.Metadata.Label title="Author Created At" text={announcement.author.created_at} />
                  <List.Item.Detail.Metadata.Label title="Author Updated At" text={announcement.author.updated_at} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="CATEGORIES" />
                  <List.Item.Detail.Metadata.Label title="---" />
                  {announcement.categories.map((category, categoryIndex) => (
                    <Fragment key={category.idx}>
                      {categoryIndex !== 0 ? <List.Item.Detail.Metadata.Label title="-" /> : undefined}
                      <List.Item.Detail.Metadata.Label title="ID" text={category.idx} />
                      <List.Item.Detail.Metadata.Label title="Name" text={category.name} />
                      <List.Item.Detail.Metadata.Label title="Color" text={category.color} />
                      <List.Item.Detail.Metadata.Label title="Created At" text={category.created_at} />
                      <List.Item.Detail.Metadata.Label title="Updated At" text={category.updated_at} />
                    </Fragment>
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="IDEAS" />
                  <List.Item.Detail.Metadata.Label title="---" />
                  {announcement.ideas.map((idea, ideaIndex) => (
                    <Fragment key={idea.idx}>
                      {ideaIndex !== 0 ? <List.Item.Detail.Metadata.Label title="-" /> : undefined}
                      <List.Item.Detail.Metadata.Label title="ID" text={idea.idx} />
                      <List.Item.Detail.Metadata.Label title="Name" text={idea.name} />
                      <List.Item.Detail.Metadata.Label title="Description" text={idea.description} />
                      <List.Item.Detail.Metadata.Label title="Created At" text={idea.created_at} />
                      <List.Item.Detail.Metadata.Label title="Updated At" text={idea.updated_at} />
                      <List.Item.Detail.Metadata.Label title="..." />
                    </Fragment>
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy All as JSON to Clipboard" content={JSON.stringify(announcement)} />
              <Action.OpenInBrowser
                title="Open In Browser"
                icon={Icon.Globe}
                url={`${FRILL_URL}announcements/${announcement.slug}`}
              />
              <Action.Push
                title="Update Announcement"
                icon={Icon.Pencil}
                target={
                  <CreateOrUpdateAnnouncement
                    initialAnnouncement={announcement}
                    onAnnouncementCreatedOrUpdated={getAnnouncementsFromApi}
                  />
                }
              />
              <Action
                title="Delete Announcement"
                style={Action.Style.Destructive}
                icon={Icon.DeleteDocument}
                onAction={() => confirmAndDeleteAnnouncement(announcement)}
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Create New Announcement"
                  icon={Icon.Plus}
                  target={<CreateOrUpdateAnnouncement onAnnouncementCreatedOrUpdated={getAnnouncementsFromApi} />}
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
            title="Create New Announcement"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New Announcement"
                  icon={Icon.Plus}
                  target={<CreateOrUpdateAnnouncement onAnnouncementCreatedOrUpdated={getAnnouncementsFromApi} />}
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

type CreateOrUpdateAnnouncementProps = {
  initialAnnouncement?: Announcement; // if initialAnnouncement is passed, we are UPDATING
  onAnnouncementCreatedOrUpdated: () => void;
};
function CreateOrUpdateAnnouncement({
  initialAnnouncement,
  onAnnouncementCreatedOrUpdated,
}: CreateOrUpdateAnnouncementProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>();
  const [admins, setAdmins] = useState<Author[]>();
  const [categories, setCategories] = useState<AnnouncementCategory[]>();
  const [errorResponse, setErrorResponse] = useState<ErrorResponse>();

  type FormValues = CreateOrUpdateAnnouncementFormValues & { ignore_content?: boolean };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const params = values;

      if (!initialAnnouncement) {
        if (!values.published_at) delete params.published_at;
      } else {
        if (!values.idea_idxs?.length) params.idea_idxs = [""];
        if (!values.category_idxs?.length) params.category_idxs = [""];
        if (values.ignore_content) delete params.content;
        delete params.ignore_content;
      }

      let message = "";
      let response;
      if (!initialAnnouncement) {
        response = await createAnnouncement(params as CreateAnnouncementRequest);
        message = "Created Announcement";
      } else {
        response = await updateAnnouncement(initialAnnouncement.idx, params as UpdateAnnouncementRequest);
        message = "Updated Announcement";
      }
      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", message);
        onAnnouncementCreatedOrUpdated();
        pop();
      } else setErrorResponse(response);
    },
    validation: {
      name: FormValidation.Required,
      author_idx: FormValidation.Required,
      content(value) {
        if (initialAnnouncement && itemProps.ignore_content.value && !value) return "The item is required";
        else if (!initialAnnouncement && !value) return "The item is required";
      },
    },
    initialValues: {
      name: initialAnnouncement ? initialAnnouncement.name : undefined,
      author_idx: initialAnnouncement ? initialAnnouncement.author.idx : undefined,
      content: initialAnnouncement ? initialAnnouncement.content : undefined,
      published_at: initialAnnouncement
        ? !initialAnnouncement.published_at
          ? null
          : new Date(initialAnnouncement.published_at)
        : undefined,
      idea_idxs: initialAnnouncement ? initialAnnouncement.ideas.map((idea) => idea.idx) : undefined,
      category_idxs: initialAnnouncement ? initialAnnouncement.categories.map((category) => category.idx) : undefined,
    },
  });

  async function getIdeasAdminsAndAnnouncementCategoriesFromApi() {
    setIsLoading(true);

    const [ideasResponse, adminsResponse, announcementCategoriesResponse] = await Promise.all([
      getIdeas(),
      getAdmins(),
      getAnnouncementCategories(),
      showToast({
        title: "PROCESSING",
        message: "Fetching Admins, Ideas and Announcement Categories",
        style: Toast.Style.Animated,
      }),
    ]);

    let numOfIdeas = 0;
    let numOfAdmins = 0;
    let numOfAnnouncementCategories = 0;
    if ("data" in ideasResponse) {
      setIdeas(ideasResponse.data);
      numOfIdeas = ideasResponse.data.length;
    }
    if ("data" in adminsResponse) {
      setAdmins(adminsResponse.data);
      numOfAdmins = adminsResponse.data.length;
    }
    if ("data" in announcementCategoriesResponse) {
      setCategories(announcementCategoriesResponse.data);
      numOfAnnouncementCategories = announcementCategoriesResponse.data.length;
    }

    await showToast({
      title: "SUCCESS",
      message: `Fetched ${numOfAdmins} authors, ${numOfIdeas} ideas and ${numOfAnnouncementCategories} categories`,
    });
    setIsLoading(false);
  }

  useEffect(() => {
    getIdeasAdminsAndAnnouncementCategoriesFromApi();
  }, []);

  const navigationTitle = initialAnnouncement ? "Update Announcement" : "Create New Announcement";

  return errorResponse ? (
    <ErrorComponent response={errorResponse} />
  ) : (
    <Form
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        {...itemProps.name}
        info="Title of the Announcement"
        placeholder="New Announcement"
      />
      <Form.Dropdown title="Author" {...itemProps.author_idx} info="Author of the Announcement">
        {admins?.map((admin) => (
          <Form.Dropdown.Item
            key={admin.idx}
            title={admin.name}
            value={admin.idx}
            icon={admin.avatar || getAvatarIcon(admin.name)}
          />
        ))}
      </Form.Dropdown>
      {initialAnnouncement && (
        <>
          <Form.Description
            title="NOTE"
            text="Updating Content using API is still a Work-In-Progress - recommend to update content through the web interface"
          />
          <Form.Checkbox id="ignore_content" label="Ignore Content" defaultValue={true} />
        </>
      )}
      <Form.TextArea
        title="Content"
        {...itemProps.content}
        info="Announcement content in Markdown format"
        placeholder={`## Announcement Subtitle
        
lorem ipsum`}
      />
      <Form.DatePicker title="Published At" type={Form.DatePicker.Type.Date} {...itemProps.published_at} />
      <Form.TagPicker title="Ideas" {...itemProps.idea_idxs} placeholder="Idea # 1">
        {ideas?.map((idea) => <Form.TagPicker.Item key={idea.idx} title={idea.name} value={idea.idx} />)}
      </Form.TagPicker>
      <Form.TagPicker title="Categories" {...itemProps.category_idxs} placeholder="Category # 1">
        {categories?.map((category) => (
          <Form.TagPicker.Item
            key={category.idx}
            title={category.name}
            value={category.idx}
            icon={{ source: Icon.Circle, tintColor: category.color }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
