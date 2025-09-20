import { supabase } from "./supabase";

export async function insertBookmark(bookmark: Omit<Bookmark, "created_at"> & { group_id: string }) {
  return supabase.from("bookmarks").insert(bookmark).select();
}

export async function getGroups(userId: string) {
  return supabase.from("groups").select("id, name, slug").eq("user_id", userId).returns<Group[]>();
}

export async function deleteBookmark(id: string) {
  return supabase.from("bookmarks").delete().match({ id });
}

export async function moveBookmarkToGroup(bookmarkId: string, groupId: string) {
  return supabase.from("bookmarks").update({ group_id: groupId }).match({ id: bookmarkId }).select();
}

export async function getBookmarks() {
  return supabase.from("bookmarks").select("*").order("created_at", { ascending: false }).returns<Bookmark[]>();
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
  group_id: string;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  colors?: string[];
}
