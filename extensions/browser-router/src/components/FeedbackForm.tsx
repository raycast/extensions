import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { FEEDBACK_WORKER_URL } from "../config/feedbackConfig";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FEEDBACK_DRAFT_KEY = "feedback_form_draft";
const DRAFT_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function FeedbackForm() {
  const { pop } = useNavigation();

  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [customCategoryError, setCustomCategoryError] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoadedRef = useRef(false);

  // Restore draft if saved within the last 15 minutes
  useEffect(() => {
    async function restoreDraft() {
      try {
        const raw = await LocalStorage.getItem<string>(FEEDBACK_DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          const age = Date.now() - (draft.savedAt || 0);
          if (age < DRAFT_EXPIRY_MS) {
            if (draft.category) setCategory(draft.category);
            if (draft.customCategory) setCustomCategory(draft.customCategory);
            if (draft.title) setTitle(draft.title);
            if (draft.description) setDescription(draft.description);
            if (draft.email) setEmail(draft.email);
          } else {
            await LocalStorage.removeItem(FEEDBACK_DRAFT_KEY);
          }
        }
      } catch {
        // ignore parse error
      } finally {
        isLoadedRef.current = true;
      }
    }
    restoreDraft();
  }, []);

  // Persist draft to LocalStorage with timestamp (debounced on state change)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (category || customCategory || title || description || email) {
      LocalStorage.setItem(
        FEEDBACK_DRAFT_KEY,
        JSON.stringify({
          category,
          customCategory,
          title,
          description,
          email,
          savedAt: Date.now(),
        }),
      );
    }
  }, [category, customCategory, title, description, email]);

  async function handleClearDraft() {
    await LocalStorage.removeItem(FEEDBACK_DRAFT_KEY);
    setCategory("");
    setCustomCategory("");
    setTitle("");
    setDescription("");
    setEmail("");
    setCategoryError(undefined);
    setCustomCategoryError(undefined);
    setTitleError(undefined);
    setDescriptionError(undefined);
    setEmailError(undefined);
    await showToast({ style: Toast.Style.Success, title: "Draft Cleared" });
  }

  // Dynamic, context-aware title placeholders that adapt to the selected category
  const titlePlaceholder =
    category === "bug"
      ? "e.g. Brave profile not loading logins, Edge inprivate shortcut..."
      : category === "feature"
        ? "e.g. Auto-detect Zen Browser, custom URL query presets..."
        : category === "general"
          ? "e.g. Loving the dual-mode search, quick idea on list layout..."
          : category === "other"
            ? "e.g. Shortcut customization, UI layout proposal..."
            : "e.g. Add Zen Browser support, or Brave profile launch issue...";

  interface FormValues {
    category?: string;
    customCategory?: string;
    title?: string;
    description?: string;
    email?: string;
  }

  async function handleSubmit(values?: FormValues) {
    const selectedCategory = values?.category || category;
    const selectedCustomCategory = values?.customCategory || customCategory;
    const enteredTitle = values?.title || title;
    const enteredDescription = values?.description || description;
    const enteredEmail = values?.email || email;
    let hasError = false;

    if (!selectedCategory) {
      setCategoryError("Please select a feedback category");
      hasError = true;
    } else {
      setCategoryError(undefined);
    }

    if (selectedCategory === "other" && !selectedCustomCategory.trim()) {
      setCustomCategoryError("Please specify the category");
      hasError = true;
    } else {
      setCustomCategoryError(undefined);
    }

    if (!enteredTitle.trim()) {
      setTitleError("Title is required");
      hasError = true;
    } else {
      setTitleError(undefined);
    }

    if (!enteredDescription.trim()) {
      setDescriptionError("Details are required");
      hasError = true;
    } else {
      setDescriptionError(undefined);
    }

    const trimmedEmail = enteredEmail.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address or leave empty");
      hasError = true;
    } else {
      setEmailError(undefined);
    }

    if (hasError) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending feedback...",
    });

    // Webhook URL is routed securely through Cloudflare Worker relay

    let categoryAuthor = "💬 GENERAL FEEDBACK";
    let embedColor = 3900150; // Electric Sky Blue (#3B82F6)

    if (selectedCategory === "bug") {
      categoryAuthor = "🚨 BUG REPORT";
      embedColor = 15680324; // Crimson Red (#EF4444)
    } else if (selectedCategory === "feature") {
      categoryAuthor = "✨ FEATURE REQUEST";
      embedColor = 16096779; // Radiant Amber (#F59E0B)
    } else if (selectedCategory === "other") {
      const typeName = selectedCustomCategory.trim() || "Feedback";
      categoryAuthor = `🧩 ${typeName.toUpperCase()}`;
      embedColor = 9133302; // Violet (#8B5CF6)
    }

    const fields = [
      { name: "👤 Submitter", value: trimmedEmail || "Anonymous", inline: true },
      { name: "💻 Platform", value: "Windows", inline: true },
    ];

    if (selectedCategory === "other" && selectedCustomCategory.trim()) {
      fields.push({ name: "🏷️ Topic", value: selectedCustomCategory.trim(), inline: true });
    }

    const embed = {
      author: {
        name: categoryAuthor,
      },
      title: enteredTitle.trim(),
      description: enteredDescription.trim(),
      color: embedColor,
      fields,
      footer: { text: "Browser Router v1.0" },
      timestamp: new Date().toISOString(),
    };

    if (FEEDBACK_WORKER_URL && FEEDBACK_WORKER_URL.trim().startsWith("https://")) {
      try {
        const response = await fetch(FEEDBACK_WORKER_URL.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: selectedCategory,
            embed,
          }),
        });

        if (response.ok) {
          await LocalStorage.removeItem(FEEDBACK_DRAFT_KEY);
          toast.style = Toast.Style.Success;
          toast.title = "Feedback Sent!";
          toast.message = "Thank you! We have received your feedback.";
          pop();
        } else {
          let errDetail = `Status ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson && typeof errJson === "object" && "error" in errJson) {
              errDetail = String(errJson.error);
            }
          } catch {
            // ignore
          }
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to send feedback";
          toast.message = errDetail;
        }
      } catch (err: unknown) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to send feedback";
        toast.message = err instanceof Error ? err.message : String(err);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Feedback Validated!";
      toast.message = "Cloudflare Worker relay is not configured.";
      setIsSubmitting(false);
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Feedback" icon={Icon.Envelope} onSubmit={handleSubmit} />
          <Action
            title="Clear Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "backspace" }}
            onAction={handleClearDraft}
          />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description text="Have a complaint, idea, or request? Send it directly to our team!" />

      <Form.Dropdown
        id="category"
        title="Category"
        value={category}
        onChange={(val) => {
          setCategory(val);
          if (val) setCategoryError(undefined);
        }}
        error={categoryError}
      >
        <Form.Dropdown.Item value="" title="Select Feedback Category..." icon={Icon.QuestionMark} />
        <Form.Dropdown.Item value="bug" title="Bug Report / Complaint" icon={Icon.ExclamationMark} />
        <Form.Dropdown.Item value="feature" title="Feature Request / Future Update" icon={Icon.Stars} />
        <Form.Dropdown.Item value="general" title="General Feedback" icon={Icon.Message} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Tag} />
      </Form.Dropdown>

      {category === "other" && (
        <Form.TextField
          id="customCategory"
          title="Specify Category"
          placeholder="e.g. Performance, Translation, Shortcut idea..."
          value={customCategory}
          onChange={(val) => {
            setCustomCategory(val);
            if (val.trim()) setCustomCategoryError(undefined);
          }}
          error={customCategoryError}
        />
      )}

      <Form.TextField
        id="title"
        title="Title"
        placeholder={titlePlaceholder}
        value={title}
        onChange={(val) => {
          setTitle(val);
          if (val.trim()) setTitleError(undefined);
        }}
        error={titleError}
      />

      <Form.TextArea
        id="description"
        title="Details"
        placeholder="Describe your idea, complaint, or issue with as much detail as possible..."
        value={description}
        onChange={(val) => {
          setDescription(val);
          if (val.trim()) setDescriptionError(undefined);
        }}
        error={descriptionError}
      />

      <Form.Separator />

      <Form.TextField
        id="email"
        title="Your Email"
        placeholder="your.email@example.com"
        value={email}
        onChange={(val) => {
          setEmail(val);
          if (val.trim()) setEmailError(undefined);
        }}
        error={emailError}
      />
    </Form>
  );
}
