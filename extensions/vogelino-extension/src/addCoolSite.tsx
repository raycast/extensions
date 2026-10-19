import { Action, ActionPanel, Form, Icon, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import ListCoolSitesCommand from "./index";
import { addCoolSite } from "./utils/addCoolSite";
import CommonActions from "./utils/commonActions";
import { CoolSiteInsertType, coolSiteInsertSchema } from "./utils/coolSiteTypesAndSchemas";
import { enrichCoolSite } from "./utils/enrichCoolSite";
import { CurrentBrowserPage, getCurrentBrowserPage } from "./utils/getCurrentBrowserPage";
import { normalizeCoolSiteTitle, normalizeCoolSiteUrl } from "./utils/normalizeCoolSite";
import { useCoolSites } from "./utils/useCoolSites";

export default function Command() {
  const { coolSites, tags } = useCoolSites();
  const { pop } = useNavigation();
  const [url, setUrl] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState<CurrentBrowserPage | null>(null);
  const hasEnriched = useRef(false);

  useEffect(() => {
    getCurrentBrowserPage()
      .then((currentPage) => {
        const normalizedTitle = normalizeCoolSiteTitle(currentPage.title);
        if (currentPage.url) setUrl(normalizeCoolSiteUrl(currentPage.url));
        if (normalizedTitle) setName(normalizedTitle);
        setPage(currentPage);
      })
      .catch(() => {
        // Browser integration is optional; leave the fields empty when it is unavailable.
      });
  }, []);

  useEffect(() => {
    if (!page || tags.length === 0 || hasEnriched.current) return;
    hasEnriched.current = true;
    const initialTitle = normalizeCoolSiteTitle(page.title);
    void enrichCoolSite({ title: initialTitle, content: page.content, knownTags: tags }).then((enriched) => {
      setName((current) => (current === initialTitle ? enriched.title : current));
      setSelectedTags(enriched.tags);
    });
  }, [page, tags]);

  async function handleSubmit(values: CoolSiteInsertType) {
    let normalizedUrl = values.url;
    try {
      normalizedUrl = normalizeCoolSiteUrl(values.url);
    } catch {
      // Let the schema below provide the form's validation message.
    }
    const parsedValues = coolSiteInsertSchema.safeParse({
      ...values,
      name: normalizeCoolSiteTitle(values.name),
      url: normalizedUrl,
    });
    if (!parsedValues.success) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Add Cool Site",
        message: parsedValues.error.issues[0]?.message,
      });
      return;
    }

    const duplicate = coolSites.find((site) => normalizeCoolSiteUrl(site.url) === parsedValues.data.url);
    if (duplicate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Site Already Saved",
        message: normalizeCoolSiteTitle(duplicate.title),
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${parsedValues.data.name}`,
    });

    try {
      await addCoolSite(parsedValues.data);
      toast.style = Toast.Style.Success;
      toast.title = `Queued ${parsedValues.data.name}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could Not Add ${parsedValues.data.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Cool Site" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action.Push
            title="See All Cool Sites"
            icon={Icon.List}
            shortcut={Keyboard.Shortcut.Common.Open}
            target={<ListCoolSitesCommand />}
          />
          <CommonActions />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter the Cool Site Name"
        value={name}
        onChange={(value) => setName(value)}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="Enter the Cool Site URL"
        value={url}
        onChange={(value) => setUrl(value)}
      />
      <Form.TagPicker
        id="tags"
        title="Tags"
        placeholder="Enter the Cool Site Tags"
        value={selectedTags}
        onChange={setSelectedTags}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
