import { basename } from "node:path";
import { brandFor, findPlaceholder, routerAppOf } from "./generate-script";

export type TitleSuggestionInput = {
  target: string;
  /**
   * The brand to name the command after. The form passes what the collection has already filed this host
   * under before falling back to `brandFor`, so a title agrees with the Package field it sits above rather
   * than calling `atlassian.net` "Atlassian" while the subtitle says `Jira`.
   */
  brand?: string;
  /** The Desktop App choice. Only counts where the generator would actually build a router from it. */
  desktopApplication?: string;
};

const folderName = (target: string) => {
  const name = basename(target.replace(/\/+$/, ""));
  return name && name !== "~" ? name : undefined;
};

/**
 * A title that is only a starting point. It is phrased the way the generated command will behave rather than
 * the way its target is spelled: a plain link is the service itself (`YouTube`), a search asks to be read as
 * one (`Search YouTube`), and a folder or a router *opens* something (`Open Downloads`, `Open Linear`) — a
 * router may land in an app rather than a browser, so naming the brand alone would promise a website.
 *
 * The brand rather than the host is the default because this extension is published: `youtube.com` is what
 * the target already says, and a title that repeats it adds nothing to a row that shows the host anyway.
 * Returns undefined when the target says too little to name, so the form leaves the field empty rather
 * than filling it with a guess.
 */
export const suggestTitle = ({ target, brand, desktopApplication }: TitleSuggestionInput) => {
  const trimmed = target.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("~") || trimmed.startsWith("/")) {
    const name = folderName(trimmed);
    return name ? `Open ${name}` : undefined;
  }

  const name = brand?.trim() || brandFor(trimmed);
  if (!name) return undefined;

  if (findPlaceholder(trimmed)) return `Search ${name}`;
  if (routerAppOf({ title: "", target: trimmed, desktopApplication })) return `Open ${name}`;

  return name;
};

export type TitleState = {
  title: string;
  /** The last value this form wrote into the field, so a user edit can be told apart from its own echo. */
  suggestion: string;
  /** Set once the person has typed something of their own; from then on the field is theirs. */
  touched: boolean;
};

/**
 * A person's typing is never overwritten. Any edit that differs from the latest suggestion freezes the
 * field, and emptying it is the one way to hand it back — a cleared field is read as "I have no title in
 * mind", which is exactly the state a suggestion is for. Comparing against the suggestion, rather than
 * treating every change as a touch, is what keeps Raycast echoing a programmatic value through `onChange`
 * from freezing the field on its own.
 */
export const titleEdited = (state: TitleState, next: string): TitleState => ({
  ...state,
  title: next,
  touched: next.trim() === "" ? false : state.touched || next !== state.suggestion,
});

/** Applies a fresh suggestion, unless the field already belongs to the person. */
export const titleSuggested = (state: TitleState, suggestion: string | undefined): TitleState =>
  state.touched ? state : { title: suggestion ?? "", suggestion: suggestion ?? "", touched: false };
