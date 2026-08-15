import { useEffect, useReducer } from "react";
import useFrontmostLink, { Link } from "./use-frontmost-link";

export interface LinkFormState {
  dirty: boolean;
  hasUpdatedWithLink: boolean;
  values: {
    title: string;
    url: string;
    tags: string[];
    description: string;
  };
}

function isEqual<T>(before: T, after: T) {
  if (before === after) return true;
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return false;
    if (before.length === 0) return true;
    return before.every((val, i) => after[i] === val);
  }
  return false;
}

type FormField = keyof LinkFormState["values"];
type LinkFormAction<Field extends FormField> =
  | { type: "changeField"; field: Field; value: LinkFormState["values"][Field] }
  | { type: "updateWithLink"; link: Link | null }
  | { type: "setValues"; values: LinkFormState["values"] };

function reducer<Field extends FormField>(state: LinkFormState, action: LinkFormAction<Field>): LinkFormState {
  switch (action.type) {
    case "changeField": {
      return {
        ...state,
        dirty: !isEqual(action.value, state.values[action.field]),
        values: {
          ...state.values,
          [action.field]: action.value,
        },
      };
    }
    case "updateWithLink": {
      if (state.dirty) return state;
      return {
        ...state,
        hasUpdatedWithLink: true,
        values: {
          ...state.values,
          title: action.link?.title ?? state.values.title,
          url: action.link?.url ?? state.values.url,
        },
      };
    }
    case "setValues": {
      return {
        ...state,
        dirty: true,
        values: action.values,
      };
    }
  }
}

export default function useLinkForm(initialValues: Partial<LinkFormState["values"]> = {}) {
  const initialState: LinkFormState = {
    dirty: false,
    hasUpdatedWithLink: false,
    values: {
      description: "",
      tags: [],
      title: "",
      url: "",
      ...initialValues,
    },
  };

  const { link, loading: linkLoading } = useFrontmostLink();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (linkLoading || state.dirty || state.hasUpdatedWithLink || typeof link === "undefined") return;
    dispatch({ type: "updateWithLink", link });
  }, [linkLoading, state, link, dispatch]);

  return {
    loading: linkLoading,
    values: state.values,
    setValues: (values: LinkFormState["values"]) => dispatch({ type: "setValues", values }),
    onChange:
      <Field extends FormField>(field: Field) =>
      (value: LinkFormState["values"][Field]) => {
        dispatch({ type: "changeField", field, value });
      },
  };
}
