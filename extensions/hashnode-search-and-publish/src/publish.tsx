import { Form, ActionPanel, Action, showToast, LaunchProps, popToRoot } from "@raycast/api";
import {
  PublishPostInput,
  PublishPostTagInput,
  useGetMyPublicationQuery,
  usePublishBlogMutation,
} from "../generated/hooks_and_more";
import { apolloGqlClient } from "../grapqhqlClient";
import { useState } from "react";
import { getRandomColor } from "./profile";

export default function Publish(
  props: LaunchProps<{
    draftValues: Pick<PublishPostInput, "contentMarkdown" | "title" | "publicationId"> & { tags: string[] };
  }>,
) {
  const { draftValues } = props;
  const { data: myData, loading } = useGetMyPublicationQuery({
    client: apolloGqlClient,
  });

  const someTags = [
    {
      name: "Go Language",
      logo: "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512687168/S1D40rVLm.png",
      slug: "go",
      objectID: "56744721958ef13879b94bd0",
    },
    {
      name: "Frontend Development",
      slug: "frontend-development",
      objectID: "56a399f292921b8f79d3633c",
    },
    {
      name: "GitHub",
      logo: "https://cdn.hashnode.com/res/hashnode/image/upload/v1513321555902/BkhLElZMG.png",
      slug: "github",
      objectID: "56744721958ef13879b94c63",
    },
    {
      name: "Hashnode",
      logo: "https://cdn.hashnode.com/res/hashnode/image/upload/v1619605440273/S3_X4Rf7V.jpeg",
      slug: "hashnode",
      objectID: "567ae5a72b926c3063c3061a",
    },
    {
      name: "Python 3",
      slug: "python3",
      logo: "https://res.cloudinary.com/hashnode/image/upload/v1503468096/axvqxfbcm0b7ourhshj7.jpg",
      objectID: "56744723958ef13879b95342",
    },
    {
      name: "Codenewbies",
      slug: "codenewbies",
      objectID: "5f22b52283e4e9440619af83",
    },
    {
      name: "webdev",
      slug: "webdev",
      objectID: "56744723958ef13879b952af",
    },
    {
      name: "Machine Learning",
      logo: "https://cdn.hashnode.com/res/hashnode/image/upload/v1513321644252/Sk43El-fz.png",
      slug: "machine-learning",
      objectID: "56744722958ef13879b950a8",
    },

    {
      name: "interview",
      slug: "interview",
      objectID: "56744720958ef13879b947e1",
    },
    {
      name: "data",
      slug: "data",
      objectID: "56744721958ef13879b949d3",
    },
  ];

  const [title, setTitle] = useState(draftValues?.title || "");
  const [tags, setTags] = useState<string[]>(draftValues?.tags || []);
  const [contentMarkdown, setContentMarkdown] = useState(draftValues?.contentMarkdown || "");
  const [publication, setSelectedPublication] = useState(draftValues?.publicationId || "");
  const [publish, { data, error }] = usePublishBlogMutation({
    client: apolloGqlClient,
  });

  function handleSubmit() {
    publish({
      variables: {
        title: title?.toString(),
        contentMarkdown: contentMarkdown,
        tags: tags.map((t) => {
          return {
            name: t,
            slug: t,
          };
        }),
        publicationId: publication || draftValues?.publicationId || myData?.me?.publications?.edges?.[0]?.node?.id,
      },
      client: apolloGqlClient,
      onCompleted(data, clientOptions) {
        showToast({ title: "Blog Published", message: `Live on : ${data?.publishPost?.post?.url}` });
      },
    });
    popToRoot();
  }
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Description text="Write your technical blog" />
      <Form.Dropdown id="dropdown" isLoading={loading} title="Select Publication">
        {myData?.me?.publications?.edges?.map((t) => (
          <Form.Dropdown.Item
            key={t.node?.id}
            title={!!t?.node?.displayTitle ? t?.node?.displayTitle : ""}
            value={t?.node?.id}
            icon={{
              source: {
                dark: !!t?.node?.favicon ? t?.node?.favicon : "",
                light: !!t?.node?.favicon ? t?.node?.favicon : "",
              },
              tintColor: getRandomColor(),
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="textfield" title="Title" placeholder="Blog Title" value={title} onChange={setTitle} />
      <Form.TextArea
        id="textarea"
        title="Text area"
        placeholder="Content (Markdown enabled)"
        value={contentMarkdown}
        onChange={setContentMarkdown}
        enableMarkdown
      />
      <Form.Separator />

      <Form.TagPicker id="tokeneditor" title="Tag Picker" value={tags} onChange={setTags}>
        {someTags?.map((t) => <Form.TagPicker.Item key={t?.objectID} value={t?.slug} title={t?.name} />)}
      </Form.TagPicker>
    </Form>
  );
}
