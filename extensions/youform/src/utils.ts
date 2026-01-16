import { Image, Icon, Color } from "@raycast/api";
import { Block, Form } from "./types";

export function getFormIcon(form: Form): Image.ImageLike {
  if (form.deleted_at) return { source: Icon.Trash, tintColor: Color.Red };
  if (form.closed) return { source: Icon.Xmark, tintColor: Color.Red };
  if (!form.published_at) return { source: Icon.Dot, tintColor: Color.Blue };
  if (form.close_by_date || form.close_by_submissions) return { source: Icon.Dot, tintColor: Color.Yellow };
  return { source: Icon.Dot, tintColor: Color.Green };
}
export function getBlockTitle(block?: Block) {
  if (!block) return "";
  const title = block.display_name || block.title || block.shadow_title || block.question || block.shadow_question;
  return `${title || ""}`;
}
