import { Action, ActionPanel, Detail, Form, Icon, List, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { InvalidApiKeyView } from "./components/invalid-api-key";
import { UnauthorizedError, apiFetch } from "./lib/api";
import { CURRENCIES, CURRENCY_CODES } from "./lib/currencies";
import { API_BASE, type CreateItemInput, type ProductInfoResponse, type WishlistsResponse } from "./lib/types";
import { ALLOWED_IMAGE_EXTENSIONS, isAllowedImagePath, uploadItemImage } from "./lib/upload";

type FormState = {
  wishlistId: string;
  url: string;
  title: string;
  price: string;
  currency: string;
  image: string;
  imageFile: string[];
  quantity: string;
  priorityWish: boolean;
  description: string;
};

const emptyForm = (): FormState => ({
  wishlistId: "",
  url: "",
  title: "",
  price: "",
  currency: "",
  image: "",
  imageFile: [],
  quantity: "1",
  priorityWish: false,
  description: "",
});

const isHttpUrl = (s: string): boolean => /^https?:\/\/\S+/i.test(s.trim());

export default function Command() {
  const [unauthorized, setUnauthorized] = useState(false);

  if (unauthorized) return <InvalidApiKeyView />;

  return <AddForm onUnauthorized={() => setUnauthorized(true)} />;
}

function AddForm({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    () => apiFetch<WishlistsResponse>("/api/v1/wishlists"),
    [],
    { keepPreviousData: true },
  );
  const [values, setValues] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  // Synchronous re-entry guard: `submitting` state isn't observable within the
  // same keypress tick, so a fast double ⌘↵ could create the item twice.
  const submittingRef = useRef(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    if (!error) return;
    if (error instanceof UnauthorizedError) onUnauthorized();
    else
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load wishlists",
        message: error.message,
      });
  }, [error, onUnauthorized]);

  const owned = data?.ownedWishlists ?? [];
  const shared = data?.sharedWishlists ?? [];
  const wishlists = [...owned, ...shared];

  // Seed the first wishlist as default once data arrives.
  useEffect(() => {
    if (values.wishlistId || wishlists.length === 0) return;
    const first = owned[0] ?? shared[0];
    setValues((v) => ({
      ...v,
      wishlistId: first.id,
      currency: v.currency || first.defaultCurrency,
    }));
  }, [values.wishlistId, wishlists.length, owned, shared]);

  const onWishlistChange = useCallback(
    (wishlistId: string) => {
      const wl = wishlists.find((w) => w.id === wishlistId);
      setValues((v) => ({
        ...v,
        wishlistId,
        currency: wl ? wl.defaultCurrency : v.currency,
      }));
    },
    [wishlists],
  );

  const doFetchDetails = useCallback(async () => {
    const trimmed = values.url.trim();
    if (!isHttpUrl(trimmed)) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid URL first" });
      return;
    }
    setFetchingDetails(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching product details…" });
    try {
      const res = await apiFetch<ProductInfoResponse>("/api/v1/product-info", {
        method: "POST",
        body: JSON.stringify({ url: trimmed }),
      });
      const { title, price, currency, image } = res.data;
      const filled: string[] = [];
      if (title) filled.push("title");
      if (price != null) filled.push("price");
      if (currency) filled.push("currency");
      if (image) filled.push("image");
      setValues((v) => ({
        ...v,
        ...(title ? { title } : {}),
        ...(price != null ? { price: String(price) } : {}),
        ...(currency ? { currency } : {}),
        ...(image ? { image } : {}),
      }));
      if (filled.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't read anything from that page";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `Filled ${filled.join(", ")}`;
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        onUnauthorized();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not fetch details";
        toast.message = e instanceof Error ? e.message : String(e);
      }
    } finally {
      setFetchingDetails(false);
    }
  }, [values.url, onUnauthorized]);

  const submit = useCallback(async () => {
    const wl = wishlists.find((w) => w.id === values.wishlistId);
    if (!wl) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a wishlist" });
      return;
    }
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    const priceNum = values.price.trim() ? Number(values.price) : undefined;
    if (priceNum != null && (!Number.isFinite(priceNum) || priceNum < 0)) {
      await showToast({ style: Toast.Style.Failure, title: "Price must be a positive number" });
      return;
    }
    const quantityNum = values.quantity.trim() ? Number(values.quantity) : 1;
    if (Number.isNaN(quantityNum) || quantityNum < 1 || !Number.isInteger(quantityNum)) {
      await showToast({ style: Toast.Style.Failure, title: "Quantity must be a whole number ≥ 1" });
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    let inflightToast: Toast | undefined;
    let imageKey: string | undefined;
    const localFile = values.imageFile[0];
    if (localFile) {
      inflightToast = await showToast({ style: Toast.Style.Animated, title: "Uploading image…" });
      try {
        imageKey = await uploadItemImage(localFile);
        inflightToast.title = "Adding to wishlist…";
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          await inflightToast.hide();
          onUnauthorized();
        } else {
          inflightToast.style = Toast.Style.Failure;
          inflightToast.title = "Upload failed";
          inflightToast.message = e instanceof Error ? e.message : String(e);
        }
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
    }

    const body: CreateItemInput = {
      title: values.title.trim().slice(0, 255),
      currency: (values.currency || wl.defaultCurrency).trim(),
      priorityWish: values.priorityWish,
      quantity: quantityNum,
    };
    if (values.description.trim()) body.description = values.description.trim();
    if (values.url.trim()) body.link = values.url.trim();
    if (imageKey) body.imageKey = imageKey;
    else if (values.image.trim()) body.image = values.image.trim();
    if (priceNum != null) body.price = priceNum;

    try {
      await apiFetch(`/api/v1/wishlists/${wl.id}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Tear down the animated toast, then close with an immediate pop-to-root.
      // Raycast keeps commands warm by default (the user's "Pop to Root Search"
      // preference), which would restore this filled-in form on reopen; forcing
      // Immediate exits to Raycast's root search so the next launch starts fresh.
      await inflightToast?.hide();
      await showHUD("Added to WishApp ✓", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        await inflightToast?.hide();
        onUnauthorized();
      } else {
        if (inflightToast) {
          inflightToast.style = Toast.Style.Failure;
          inflightToast.title = "Could not add item";
          inflightToast.message = e instanceof Error ? e.message : String(e);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not add item",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [values, wishlists, onUnauthorized]);

  const hasUrl = isHttpUrl(values.url);
  const titleEmpty = values.title.trim().length === 0;
  // A scraped or wishlist-default currency may not be in the curated list
  // (e.g. an uncommon ISO code). Surface it as its own item so the dropdown
  // can still display the current selection.
  const selectedCurrency = values.currency.trim();
  const currencyMissing = selectedCurrency.length > 0 && !CURRENCY_CODES.has(selectedCurrency);
  // When the user pasted a URL but hasn't set a title, promote "Fetch Details"
  // into the primary ⌘↵ slot so it reads as the expected next step.
  const fetchIsPrimary = hasUrl && titleEmpty;

  const fetchAction = (
    <Action.SubmitForm
      title="Fetch Details from URL"
      icon={Icon.Download}
      shortcut={fetchIsPrimary ? undefined : { modifiers: ["cmd"], key: "f" }}
      onSubmit={doFetchDetails}
    />
  );
  const submitAction = (
    <Action.SubmitForm
      title="Add to Wishlist"
      icon={Icon.Plus}
      shortcut={fetchIsPrimary ? { modifiers: ["cmd", "shift"], key: "return" } : undefined}
      onSubmit={submit}
    />
  );

  // No wishlists to add to yet — mirror the My Wishlists empty state with a
  // prompt to create one on the web, instead of dead-ending in an unusable form.
  if (!isLoading && wishlists.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Gift}
          title="No wishlists yet"
          description="Create your first wishlist at getwish.app, then come back here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Website" url={API_BASE} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading || submitting || fetchingDetails}
      actions={
        <ActionPanel>
          {fetchIsPrimary ? fetchAction : submitAction}
          {fetchIsPrimary ? submitAction : hasUrl && fetchAction}
          {values.image.trim() && (
            <Action.Push
              title="Preview Image"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              target={<ImagePreview imageUrl={values.image.trim()} title={values.title || "Preview"} />}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="wishlistId" title="Wishlist" value={values.wishlistId} onChange={onWishlistChange}>
        {owned.length > 0 && (
          <Form.Dropdown.Section title="My Wishlists">
            {owned.map((w) => (
              <Form.Dropdown.Item key={w.id} value={w.id} title={w.title} />
            ))}
          </Form.Dropdown.Section>
        )}
        {shared.length > 0 && (
          <Form.Dropdown.Section title="Shared with Me">
            {shared.map((w) => (
              <Form.Dropdown.Item key={w.id} value={w.id} title={w.title} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TextField
        id="url"
        title="URL"
        placeholder="Paste a product URL"
        info={hasUrl && titleEmpty ? "Press ⌘↵ to fetch product details" : undefined}
        value={values.url}
        onChange={(url) => setValues((v) => ({ ...v, url }))}
      />
      <Form.Separator />
      <Form.TextField
        id="title"
        title="Title"
        placeholder={fetchingDetails ? "Fetching…" : "What is it?"}
        value={values.title}
        onChange={(title) => setValues((v) => ({ ...v, title }))}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Notes, size, color, specific variant…"
        value={values.description}
        onChange={(description) => setValues((v) => ({ ...v, description }))}
      />
      <Form.TextField
        id="image"
        title="Image URL"
        placeholder="https://…"
        info={values.image ? "Press ⌘⇧P to preview" : undefined}
        value={values.image}
        onChange={(image) => setValues((v) => ({ ...v, image }))}
      />
      <Form.FilePicker
        id="imageFile"
        title="Upload Image"
        info={`Supported: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}. Max 5 MB. Overrides the URL above when set.`}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={values.imageFile}
        onChange={(imageFile) => {
          // Raycast's FilePicker has no native MIME filter — reject non-image
          // selections right when the user picks one, instead of letting the
          // form submit fail.
          const picked = imageFile[0];
          if (picked && !isAllowedImagePath(picked)) {
            showToast({
              style: Toast.Style.Failure,
              title: "Unsupported file type",
              message: `Use ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`,
            });
            setValues((v) => ({ ...v, imageFile: [] }));
            return;
          }
          setValues((v) => ({ ...v, imageFile }));
        }}
      />
      <Form.Separator />
      {/* Only render once a currency is seeded. A Raycast dropdown always
          forces a selection, so mounting it with an empty value would auto-pick
          the first item and clobber the wishlist's default currency. */}
      {values.currency ? (
        <Form.Dropdown
          id="currency"
          title="Currency"
          info="Defaults to the wishlist's currency."
          value={values.currency}
          onChange={(currency) => setValues((v) => ({ ...v, currency }))}
        >
          {currencyMissing && <Form.Dropdown.Item value={selectedCurrency} title={selectedCurrency} />}
          {CURRENCIES.map((c) => (
            <Form.Dropdown.Item key={c.code} value={c.code} title={`${c.code} — ${c.name}`} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField
        id="price"
        title="Price"
        placeholder="Optional"
        value={values.price}
        onChange={(price) => setValues((v) => ({ ...v, price }))}
      />
      <Form.TextField
        id="quantity"
        title="Quantity"
        value={values.quantity}
        onChange={(quantity) => setValues((v) => ({ ...v, quantity }))}
      />
      <Form.Checkbox
        id="priorityWish"
        label="Priority Wish"
        value={values.priorityWish}
        onChange={(priorityWish) => setValues((v) => ({ ...v, priorityWish }))}
      />
    </Form>
  );
}

function ImagePreview({ imageUrl, title }: { imageUrl: string; title: string }) {
  const markdown = `# ${title}\n\n![${title}](${imageUrl})`;
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Image Preview"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Image in Browser" url={imageUrl} />
          <Action.CopyToClipboard title="Copy Image URL" content={imageUrl} />
        </ActionPanel>
      }
    />
  );
}
