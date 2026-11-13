import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { createReview } from "./api";
import type { Skill } from "./api";
import { getErrorMessage } from "./api-error";
import { validateReviewForm } from "./review-form";
import type { ReviewFormErrors } from "./review-form";

interface Props {
  skill: Pick<Skill, "id" | "title">;
  token: string;
}

export function SkillReviewForm({ skill, token }: Props) {
  const { pop } = useNavigation();
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");

  const submit = async () => {
    if (isSubmitting) {
      return;
    }

    const validation = validateReviewForm({ content, rating, title });
    setErrors(validation.errors);
    if (!validation.value) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview(
        {
          ...validation.value,
          skillId: skill.id,
        },
        token,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Review submitted",
      });
      pop();
    } catch (error) {
      await showToast({
        message: getErrorMessage(error),
        style: Toast.Style.Failure,
        title: "Could not submit review",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Submit Review" onSubmit={submit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
      navigationTitle={`Review ${skill.title}`}
    >
      <Form.Description text="Your review is public and tied to your Skills.re account." title={skill.title} />
      <Form.Separator />
      <Form.Dropdown
        error={errors.rating}
        id="rating"
        title="Rating"
        value={rating}
        onChange={(value) => {
          setRating(value);
          if (errors.rating) {
            setErrors((current) => ({ ...current, rating: undefined }));
          }
        }}
      >
        <Form.Dropdown.Item title="5 — Excellent" value="5" />
        <Form.Dropdown.Item title="4 — Good" value="4" />
        <Form.Dropdown.Item title="3 — Average" value="3" />
        <Form.Dropdown.Item title="2 — Poor" value="2" />
        <Form.Dropdown.Item title="1 — Very Poor" value="1" />
      </Form.Dropdown>
      <Form.TextField
        autoFocus
        error={errors.title}
        id="title"
        info="Maximum 120 characters"
        placeholder="Summarize your experience"
        title="Title"
        value={title}
        onChange={(value) => {
          setTitle(value);
          if (errors.title) {
            setErrors((current) => ({ ...current, title: undefined }));
          }
        }}
      />
      <Form.TextArea
        enableMarkdown
        error={errors.content}
        id="content"
        info="Maximum 2000 characters"
        placeholder="What worked well? What could be improved?"
        title="Review"
        value={content}
        onChange={(value) => {
          setContent(value);
          if (errors.content) {
            setErrors((current) => ({ ...current, content: undefined }));
          }
        }}
      />
    </Form>
  );
}
