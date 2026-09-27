import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import { SignInAgainAction } from "./components/sign-in-again";
import { VariantList } from "./components/variant-list";
import { SITE_URL, authorize, personalToken } from "./lib/auth";
import { WRITE_RESERVE_CREDITS, lastWriteForCheck, listBrands } from "./lib/socialfaktory";
import type { WritingPlatform } from "./lib/types";

type Values = {
  brandId: string;
  platform: WritingPlatform;
  brief: string;
};

function WritePost() {
  const { push } = useNavigation();
  const [briefError, setBriefError] = useState<string>();
  const abortable = useRef<AbortController>(null);
  const {
    data: brands,
    isLoading,
    revalidate,
  } = useCachedPromise(() => listBrands(abortable.current?.signal), [], {
    abortable,
    failureToastOptions: { title: "Could not load your brands" },
  });
  const usable = brands?.filter((brand) => brand.status !== "archived");

  async function checkLastWrite() {
    const previous = await lastWriteForCheck();
    if (typeof previous === "string") {
      await showToast({ style: Toast.Style.Failure, title: previous });
      return;
    }
    push(<VariantList record={previous} />);
  }

  function submit(values: Values) {
    const brief = values.brief.trim();
    if (!brief) {
      setBriefError("Describe what the post should say");
      return;
    }
    push(<VariantList request={{ ...values, brief, idempotencyKey: randomUUID() }} />);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {usable && usable.length > 0 ? (
            <Action.SubmitForm title="Write Post" icon={Icon.Pencil} onSubmit={submit} />
          ) : (
            <Action.OpenInBrowser title="Create a Brand" url={SITE_URL} />
          )}
          <Action title="Check Last Write" icon={Icon.Clock} onAction={checkLastWrite} />
          <SignInAgainAction onSignedIn={revalidate} />
        </ActionPanel>
      }
    >
      {usable && usable.length === 0 ? (
        <Form.Description text="You have no brand yet. Create one on SocialFaktory, then come back to write in its voice." />
      ) : (
        <Form.Dropdown id="brandId" title="Brand" storeValue>
          {usable?.map((brand) => (
            <Form.Dropdown.Item key={brand.id} value={brand.id} title={brand.name} icon={Icon.Person} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="platform" title="Platform" storeValue>
        <Form.Dropdown.Item value="x" title="X" />
        <Form.Dropdown.Item value="linkedin" title="LinkedIn" />
      </Form.Dropdown>
      <Form.TextArea
        id="brief"
        title="Brief"
        placeholder="What the post should say: a launch, a tip, an event, a result"
        error={briefError}
        onChange={() => setBriefError(undefined)}
      />
      <Form.Description
        text={`A new brief reserves ${WRITE_RESERVE_CREDITS} credits and settles at what it used. The same brief within 30 minutes shows that write again. Nothing is published.`}
      />
    </Form>
  );
}

export default withAccessToken({ authorize, personalAccessToken: personalToken() })(WritePost);
