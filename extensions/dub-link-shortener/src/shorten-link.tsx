import "@/polyfills/fetch";
import {
  Action,
  ActionPanel,
  captureException,
  Color,
  Form,
  Icon,
  showToast,
  Toast,
  open,
  Clipboard,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { createShortLink } from "@/api";
import { fetchLink, isEmpty } from "@utils/clipboard";
import { useTags } from "@hooks/use-tags";
import { useDomains } from "@hooks/use-domains";

interface ShortLinkFormValues {
  url: string;
  key: string;
  tagIds: string[];
  domain: string;
  comments: string;
}

const ShortenLinkForm = ({ retryValues, args }: { retryValues?: ShortLinkFormValues; args: Arguments.ShortenLink }) => {
  const { push, pop } = useNavigation();
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
              onAction: () => Clipboard.copy(shortLink),
            },
            secondaryAction: {
              title: "Open Short Links",
              onAction: () => open("raycast://extensions/quuu/dub-link-shortener/search-links"),
            },
          });
        })
        .catch(async (err) => {
          captureException(err);
          const toast = await showFailureToast(err, { title: "❗ Failed to create link" });
          toast.primaryAction = {
            title: "Retry",
            onAction: () => {
              push(<ShortenLinkForm retryValues={vals} args={args} />);
              toast.hide();
            },
          };
        })
        .finally(pop);
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
      <Form.TagPicker {...itemProps.tagIds} title="Tags" placeholder="(Optional)">
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

export default function ShortenLink(props: LaunchProps<{ arguments: Arguments.ShortenLink }>) {
  return <ShortenLinkForm args={props.arguments} />;
}
