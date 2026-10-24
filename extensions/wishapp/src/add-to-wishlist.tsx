import { Action, ActionPanel, Detail, Form, Icon, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { InvalidApiKeyView } from "./components/invalid-api-key";
import { NoWishlistsView } from "./components/no-wishlists";
import { UnauthorizedError, apiFetch, useWishlists } from "./lib/api";
import { CURRENCIES, CURRENCY_CODES } from "./lib/currencies";
import { FETCH_DETAILS, PREVIEW_IMAGE, PREVIEW_IMAGE_HINT, SUBMIT_FORM, SUBMIT_HINT } from "./lib/shortcuts";
import type { CreateItemInput, ProductInfoResponse, Wishlist } from "./lib/types";
import { ALLOWED_IMAGE_EXTENSIONS, isAllowedImagePath, uploadItemImage } from "./lib/upload";

type FormState = {
  wishlistId: string;
  url: string;
  title: string;
  description: string;
  image: string;
  imageFile: string[];
  currency: string;
  price: string;
  quantity: string;
  priorityWish: boolean;
};

const EMPTY_FORM: FormState = {
  wishlistId: "",
  url: "",
  title: "",
  description: "",
  image: "",
  imageFile: [],
  currency: "",
  price: "",
  quantity: "1",
  priorityWish: false,
};

/**
 * The scraper rejects anything but https, and checks it with a literal
 * `startsWith("https://")` (lib/server/product-info/fetch.ts: fetchProductSchema),
 * so catch it here rather than round-tripping a 422 into a generic toast.
 * Mirrors `validateUrl` in components/wishlists/items/wishlist-item-form.tsx.
 *
 * Returns the parsed href, not the raw input: `HTTPS://X.COM` and `https:/x.com`
 * both parse as https yet fail the server's literal prefix check, so only the
 * normalized form is ever sent.
 */
const httpsUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

export default function Command() {
  const [unauthorized, setUnauthorized] = useState(false);

  if (unauthorized) return <InvalidApiKeyView />;

  return <AddForm onUnauthorized={() => setUnauthorized(true)} />;
}

function AddForm({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { sections, wishlists, isLoading, revalidate } = useWishlists(onUnauthorized);
  const [values, setValues] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  // Synchronous re-entry guard: `submitting` state isn't observable within the
  // same keypress tick, so a fast double submit could create the item twice.
  const submittingRef = useRef(false);

  // Seed the first wishlist as the default once data arrives.
  const first = wishlists[0];
  useEffect(() => {
    if (!first || values.wishlistId) return;
    setValues((previous) => ({
      ...previous,
      wishlistId: first.id,
      currency: previous.currency || first.defaultCurrency,
    }));
  }, [first, values.wishlistId]);

  const selectWishlist = (wishlistId: string) => {
    const wishlist = wishlists.find((candidate) => candidate.id === wishlistId);
    setValues((previous) => ({
      ...previous,
      wishlistId,
      currency: wishlist ? wishlist.defaultCurrency : previous.currency,
    }));
  };

  const fetchProductDetails = async () => {
    const url = httpsUrl(values.url);
    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid https:// URL first" });
      return;
    }

    setFetchingDetails(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching product details…" });
    try {
      const { data: product } = await apiFetch<ProductInfoResponse>("/api/v1/product-info", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const { title, price, currency, image } = product;
      setValues((previous) => ({
        ...previous,
        ...(title && { title }),
        ...(price != null && { price: String(price) }),
        ...(currency && { currency }),
        ...(image && { image }),
      }));

      const filled: string[] = [];
      if (title) filled.push("title");
      if (price != null) filled.push("price");
      if (currency) filled.push("currency");
      if (image) filled.push("image");

      toast.style = filled.length > 0 ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = filled.length > 0 ? `Filled ${filled.join(", ")}` : "Couldn't read anything from that page";
    } catch (error) {
      await toast.hide();
      if (error instanceof UnauthorizedError) onUnauthorized();
      else showFailureToast(error, { title: "Could not fetch details" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const addItem = async () => {
    const wishlist = wishlists.find((candidate) => candidate.id === values.wishlistId);
    if (!wishlist) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a wishlist" });
      return;
    }

    const price = values.price.trim() ? Number(values.price) : undefined;
    const quantity = values.quantity.trim() ? Number(values.quantity) : 1;
    const invalid = validate(values, price, quantity);
    if (invalid) {
      await showToast({ style: Toast.Style.Failure, title: invalid });
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const localFile = values.imageFile[0];
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: localFile ? "Uploading image…" : "Adding to wishlist…",
    });
    let uploaded = !localFile;

    try {
      const imageKey = localFile ? await uploadItemImage(localFile) : undefined;
      uploaded = true;
      toast.title = "Adding to wishlist…";

      await apiFetch(`/api/v1/wishlists/${wishlist.id}/items`, {
        method: "POST",
        body: JSON.stringify(buildItem(values, wishlist, { price, quantity, imageKey })),
      });

      // Tear down the animated toast, then close with an immediate pop-to-root.
      // Raycast keeps commands warm by default (the user's "Pop to Root Search"
      // preference), which would restore this filled-in form on reopen. Forcing
      // Immediate exits to Raycast's root search so the next launch starts fresh.
      await toast.hide();
      await showHUD("Added to WishApp ✓", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await toast.hide();
      if (error instanceof UnauthorizedError) onUnauthorized();
      else showFailureToast(error, { title: uploaded ? "Could not add item" : "Could not upload image" });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const hasUrl = httpsUrl(values.url) !== undefined;
  const titleEmpty = values.title.trim().length === 0;
  // A scraped or wishlist-default currency may not be in the curated list (an
  // uncommon ISO code, say). Surface it as its own item so the dropdown can
  // still display the current selection.
  const selectedCurrency = values.currency.trim();
  const currencyMissing = selectedCurrency.length > 0 && !CURRENCY_CODES.has(selectedCurrency);
  // When the user pasted a URL but hasn't set a title, promote "Fetch Details"
  // into the primary submit slot so it reads as the expected next step.
  const fetchIsPrimary = hasUrl && titleEmpty;

  const fetchAction = (
    <Action.SubmitForm
      title="Fetch Details from URL"
      icon={Icon.Download}
      shortcut={fetchIsPrimary ? undefined : FETCH_DETAILS}
      onSubmit={fetchProductDetails}
    />
  );
  const submitAction = (
    <Action.SubmitForm
      title="Add to Wishlist"
      icon={Icon.Plus}
      shortcut={fetchIsPrimary ? SUBMIT_FORM : undefined}
      onSubmit={addItem}
    />
  );

  // No wishlists to add to yet: prompt to create one on the web instead of
  // dead-ending in an unusable form.
  if (!isLoading && wishlists.length === 0) return <NoWishlistsView onRefresh={revalidate} />;

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
              shortcut={PREVIEW_IMAGE}
              target={<ImagePreview imageUrl={values.image.trim()} title={values.title || "Preview"} />}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="wishlistId" title="Wishlist" value={values.wishlistId} onChange={selectWishlist}>
        {sections
          .filter(([, sectionWishlists]) => sectionWishlists.length > 0)
          .map(([title, sectionWishlists]) => (
            <Form.Dropdown.Section key={title} title={title}>
              {sectionWishlists.map((wishlist) => (
                <Form.Dropdown.Item key={wishlist.id} value={wishlist.id} title={wishlist.title} />
              ))}
            </Form.Dropdown.Section>
          ))}
      </Form.Dropdown>
      <Form.TextField
        id="url"
        title="URL"
        placeholder="Paste a product URL"
        info={fetchIsPrimary ? `Press ${SUBMIT_HINT} to fetch product details` : undefined}
        value={values.url}
        onChange={(url) => setValues((previous) => ({ ...previous, url }))}
      />
      <Form.Separator />
      <Form.TextField
        id="title"
        title="Title"
        placeholder={fetchingDetails ? "Fetching…" : "What is it?"}
        value={values.title}
        onChange={(title) => setValues((previous) => ({ ...previous, title }))}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Notes, size, color, specific variant…"
        value={values.description}
        onChange={(description) => setValues((previous) => ({ ...previous, description }))}
      />
      <Form.TextField
        id="image"
        title="Image URL"
        placeholder="https://…"
        info={values.image ? `Press ${PREVIEW_IMAGE_HINT} to preview` : undefined}
        value={values.image}
        onChange={(image) => setValues((previous) => ({ ...previous, image }))}
      />
      <Form.FilePicker
        id="imageFile"
        title="Upload Image"
        info={`Supported: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}. Max 5 MB. Overrides the URL above when set.`}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={values.imageFile}
        onChange={(imageFile) => {
          // Raycast's FilePicker has no MIME filter, so reject non-image
          // selections as the user picks one rather than letting submit fail.
          const picked = imageFile[0];
          if (picked && !isAllowedImagePath(picked)) {
            showToast({
              style: Toast.Style.Failure,
              title: "Unsupported file type",
              message: `Use ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`,
            });
            setValues((previous) => ({ ...previous, imageFile: [] }));
            return;
          }
          setValues((previous) => ({ ...previous, imageFile }));
        }}
      />
      <Form.Separator />
      {/* Only render once a currency is seeded. A Raycast dropdown always forces
          a selection, so mounting it with an empty value would auto-pick the
          first item and clobber the wishlist's default currency. */}
      {values.currency ? (
        <Form.Dropdown
          id="currency"
          title="Currency"
          info="Defaults to the wishlist's currency."
          value={values.currency}
          onChange={(currency) => setValues((previous) => ({ ...previous, currency }))}
        >
          {currencyMissing && <Form.Dropdown.Item value={selectedCurrency} title={selectedCurrency} />}
          {CURRENCIES.map((currency) => (
            <Form.Dropdown.Item
              key={currency.code}
              value={currency.code}
              title={`${currency.code} · ${currency.name}`}
            />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField
        id="price"
        title="Price"
        placeholder="Optional"
        value={values.price}
        onChange={(price) => setValues((previous) => ({ ...previous, price }))}
      />
      <Form.TextField
        id="quantity"
        title="Quantity"
        placeholder="1"
        value={values.quantity}
        onChange={(quantity) => setValues((previous) => ({ ...previous, quantity }))}
      />
      <Form.Checkbox
        id="priorityWish"
        label="Priority Wish"
        value={values.priorityWish}
        onChange={(priorityWish) => setValues((previous) => ({ ...previous, priorityWish }))}
      />
    </Form>
  );
}

function validate(values: FormState, price: number | undefined, quantity: number): string | undefined {
  if (!values.title.trim()) return "Title is required";
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) return "Price must be a positive number";
  if (!Number.isInteger(quantity) || quantity < 1) return "Quantity must be a whole number of 1 or more";
  return undefined;
}

function buildItem(
  values: FormState,
  wishlist: Wishlist,
  extras: { price: number | undefined; quantity: number; imageKey: string | undefined },
): CreateItemInput {
  const item: CreateItemInput = {
    title: values.title.trim().slice(0, 255),
    currency: (values.currency || wishlist.defaultCurrency).trim(),
    priorityWish: values.priorityWish,
    quantity: extras.quantity,
  };
  if (values.description.trim()) item.description = values.description.trim();
  // Store the same canonical href we scraped. An http link is valid to save
  // even though it can't be scraped, so it passes through untouched.
  if (values.url.trim()) item.link = httpsUrl(values.url) ?? values.url.trim();
  if (extras.imageKey) item.imageKey = extras.imageKey;
  else if (values.image.trim()) item.image = values.image.trim();
  if (extras.price !== undefined) item.price = extras.price;
  return item;
}

function ImagePreview({ imageUrl, title }: { imageUrl: string; title: string }) {
  return (
    <Detail
      markdown={`# ${title}\n\n![${title}](${imageUrl})`}
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
