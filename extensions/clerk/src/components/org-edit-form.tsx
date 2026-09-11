import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parseMetadata, stringifyMetadata } from "../lib/metadata";

export function EditOrgForm({
  app,
  organizationId,
  onSaved,
}: {
  app: ClerkApp;
  organizationId: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const { data: org, isLoading } = useCachedPromise(
    (id: string) => clientFor(app).organizations.getOrganization({ organizationId: id }),
    [organizationId],
    { onError: showClerkError },
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [publicMeta, setPublicMeta] = useState("");
  const [privateMeta, setPrivateMeta] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setSlug(org.slug ?? "");
    setPublicMeta(stringifyMetadata(org.publicMetadata));
    setPrivateMeta(stringifyMetadata(org.privateMetadata));
  }, [org]);

  async function submit() {
    let publicMetadata: Record<string, unknown>;
    let privateMetadata: Record<string, unknown>;
    try {
      publicMetadata = parseMetadata(publicMeta);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid JSON in public metadata" });
      return;
    }
    try {
      privateMetadata = parseMetadata(privateMeta);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid JSON in private metadata" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating organization" });
    try {
      await clientFor(app).organizations.updateOrganization(organizationId, {
        name: name.trim(),
        slug: slug.trim() || undefined,
      });
      await clientFor(app).organizations.replaceOrganizationMetadata(organizationId, {
        publicMetadata,
        privateMetadata,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Organization updated";
      onSaved();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Organization" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextField id="slug" title="Slug" value={slug} onChange={setSlug} />
      <Form.TextArea id="publicMeta" title="Public Metadata (JSON)" value={publicMeta} onChange={setPublicMeta} />
      <Form.TextArea id="privateMeta" title="Private Metadata (JSON)" value={privateMeta} onChange={setPrivateMeta} />
    </Form>
  );
}
