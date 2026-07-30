export interface ReviewFormValues {
  content: string;
  rating: string;
  title: string;
}

export interface ReviewFormErrors {
  content?: string;
  rating?: string;
  title?: string;
}

export interface ValidReviewFormValue {
  content: string;
  rating: number;
  title: string;
}

export type ReviewFormValidation =
  { errors: ReviewFormErrors; value?: never } | { errors: ReviewFormErrors; value: ValidReviewFormValue };

const TITLE_MAX_LENGTH = 120;
const CONTENT_MAX_LENGTH = 2000;

export const validateReviewForm = (values: ReviewFormValues): ReviewFormValidation => {
  const content = values.content.trim();
  const rating = Number(values.rating);
  const title = values.title.trim();
  const errors: ReviewFormErrors = {};

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Choose a rating from 1 to 5.";
  }

  if (!title) {
    errors.title = "Title is required.";
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (!content) {
    errors.content = "Review content is required.";
  } else if (content.length > CONTENT_MAX_LENGTH) {
    errors.content = `Review content must be ${CONTENT_MAX_LENGTH} characters or fewer.`;
  }

  return Object.keys(errors).length
    ? { errors }
    : {
        errors,
        value: {
          content,
          rating,
          title,
        },
      };
};
