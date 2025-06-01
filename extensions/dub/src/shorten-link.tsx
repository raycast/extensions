import {
  Action,
  ActionPanel,
  captureException,
  Color,
  Form,
  Icon,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
  LaunchProps,
  Keyboard,
} from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { createShortLink } from "@/api";
import { fetchLink, isEmpty } from "@utils/clipboard";
import { useTags } from "@hooks/use-tags";
import { useDomains } from "@hooks/use-domains";
import { withDubClient } from "./with-dub-client";
import { SearchLinks } from "@/search-links";

interface ShortLinkFormValues {
  url: string;
  key: string;
  tagIds: string[];
  domain: string;
  comments: string;
}

const ShortenLinkForm = ({ retryValues, args }: { retryValues?: ShortLinkFormValues; args: Arguments.ShortenLink }) => {
  const { push } = useNavigation();
  const { url, key } = args;
  const { data: originalLink, isLoading: isLoadingLink } = useCachedPromise(fetchLink, [], { execute: isEmpty(url) });
  const { tags } = useTags();
  const { domains } = useDomains();

  const { handleSubmit, itemProps } = useForm<ShortLinkFormValues>({
    onSubmit: async (vals) => {
      await showToast({ style: Toast.Style.Animated, title: "Creating link..." });
      createShortLink({ originalUrl: vals.url, ...vals })
        .then(async ({ shortLink }) => {
          await Clipboard.copy(shortLink);
          await showToast({
            style: Toast.Style.Success,
            title: "✅ Link created",
            message: shortLink,
            primaryAction: {
              title: "Copy Short Link",
              shortcut: Keyboard.Shortcut.Common.Copy,
              onAction: () => Clipboard.copy(shortLink),
            },
            secondaryAction: {
              title: "Open Short Links",
              shortcut: Keyboard.Shortcut.Common.Open,
              onAction: async (toast) => {
                push(<SearchLinks />);
                await toast.hide();
              },
            },
          });
        })
        .catch(async (err) => {
          captureException(err);
          const toast = await showFailureToast(err, { title: "❗ Failed to create link" });
          toast.primaryAction = {
            title: "Retry",
            shortcut: Keyboard.Shortcut.Common.Refresh,
            onAction: () => {
              push(<ShortenLinkForm retryValues={vals} args={args} />);
              toast.hide();
            },
          };
        });
    },
    validation: {
      url: FormValidation.Required,
      domain: FormValidation.Required,
    },
    initialValues: retryValues ?? { domain: "dub.sh", url: isEmpty(url) ? originalLink : url, key },
  });

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory text="Dashboard" target="https://app.dub.co" />}
      isLoading={isLoadingLink}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten Link" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={"❗"} text="Your shortened link will be copied to your clipboard." />
      <Form.Separator />
      <Form.TextField {...itemProps.url} placeholder="https://dub.co" title="Original URL" />
      <Form.TextField {...itemProps.key} placeholder="(Optional)" title="URL Key" />
      {/* todo: Add commands to create/manage tags in the workspace */}
      <Form.TagPicker {...itemProps.tagIds} title="Tags" placeholder="(Optional)" info="Add tags in Dub.co">
        {tags.map((t) => (
          <Form.TagPicker.Item
            key={t.id}
            value={t.id}
            title={t.name}
            icon={{ source: Icon.Tag, tintColor: Color.Orange }}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown {...itemProps.domain} title="Domain">
        <Form.Dropdown.Item
          key="dub.sh"
          value="dub.sh"
          title="dub.sh"
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        />
        {domains.map((d) => (
          <Form.Dropdown.Item
            key={d.id}
            value={d.slug}
            title={d.slug}
            icon={{ source: Icon.Globe, tintColor: Color.Purple }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField {...itemProps.comments} placeholder="(Optional)" title="Comments" />
    </Form>
  );
};

function ShortenLink(props: LaunchProps<{ arguments: Arguments.ShortenLink }>) {
  return <ShortenLinkForm args={props.arguments} />;
}

export default withDubClient(ShortenLink);
