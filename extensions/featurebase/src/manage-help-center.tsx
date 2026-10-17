import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { featurebase } from "./featurebase";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { ArticleState, CreateArticleRequest } from "./types";
import { useState } from "react";

export default function ManageHelpCenter() {
  const [state, setState] = useState("live");
  const {
    isLoading,
    data: articles,
    pagination,
    mutate,
  } = useCachedPromise(
    (state) => async (options) => {
      const result = await featurebase.helpCenter.articles.list({ page: options.page + 1, state });
      return {
        data: result.results,
        hasMore: result.totalResults > result.page * result.limit,
      };
    },
    [state],
    { initialData: [] },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="State" onChange={setState} storeValue>
          <List.Dropdown.Item icon={Icon.Livestream} title="Published" value="live" />
          <List.Dropdown.Item icon={Icon.Bookmark} title="Draft" value="draft" />
        </List.Dropdown>
      }
    >
      {articles.map((article) => (
        <List.Item
          key={article.articleId}
          icon={Icon.Book}
          title={article.title}
          accessories={[{ tag: article.state === ArticleState.Draft ? "Draft" : "Published" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://${article.organizationId}.featurebase.app/dashboard/articles/${article.articleId}`}
              />
              <Action.Push icon={Icon.Plus} title="New Article" target={<NewArticle />} onPop={mutate} />
              <Action
                icon={Icon.Trash}
                title="Delete Article"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Warning, tintColor: Color.Red },
                    title: `Are you sure you want to delete the "${article.title}" article?`,
                    message: "This action cannot be undone, and all the data will be permanently deleted.",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", article.title);
                        try {
                          await mutate(featurebase.helpCenter.articles.delete({ id: article.articleId }), {
                            optimisticUpdate(data) {
                              return data.filter((a) => a.articleId !== article.articleId);
                            },
                            shouldRevalidateAfter: false,
                          });
                          toast.style = Toast.Style.Success;
                          toast.title = "Deleted";
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = `${error}`;
                        }
                      },
                    },
                  })
                }
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewArticle() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateArticleRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating article", values.title);
      try {
        const result = await featurebase.helpCenter.articles.create(values);
        toast.style = Toast.Style.Success;
        toast.title = "Article created successfully";
        toast.message = result.title;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      title: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="New Article" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Untitled document" {...itemProps.title} />
      <Form.TextField title="Description" placeholder="Page description (optional)" {...itemProps.description} />
    </Form>
  );
}
