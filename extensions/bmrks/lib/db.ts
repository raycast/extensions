import { supabase } from "./supabase";

export async function insertBookmark(bookmark: Omit<Bookmark, "created_at"> & { group_id: string }) {
  return supabase.from("bookmarks").insert(bookmark).select();
}

export function getGroup(slug: string, userId: string) {
  return supabase.from("groups").select("id").eq("user_id", userId).eq("slug", slug).returns<Group>().single();
}

export function getGroups(userId: string) {
  return supabase.from("groups").select("id, name, slug").eq("user_id", userId).returns<Group[]>();
}

export async function getBookmarksByGroupId(groupId: string) {
  return supabase
    .from("bookmarks")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .returns<Bookmark[]>();
}

export interface Bookmark {
  id?: string;
  created_at: string;
  type: "link" | "text" | "color" | "image";
  url?: string;
  title?: string;
  description?: string;
  favicon_url?: string;
  localId?: string;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  colors?: string[];
}
