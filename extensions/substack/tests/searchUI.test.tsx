// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import CachedPostItem from "@/components/CachedPostItem";
import CachedProfilePosts from "@/components/CachedProfilePosts";
import LanguageDropdown from "@/components/LanguageDropdown";
import PostItem from "@/components/PostItem";
import ProfileItem from "@/components/ProfileItem";
import ProfilePosts from "@/components/ProfilePosts";
import UserProfilePosts from "@/components/UserProfilePosts";
import SearchPosts from "@/search-substack-posts";
import SearchProfiles from "@/search-substack-profiles";

import { open, push } from "./mocks/raycast";
import { useFetch } from "./mocks/utils";

const post: any = {
  id: 42,
  _id: "42_hello",
  title: "Post title",
  subtitle: "Subtitle",
  post_date: "2026-01-01T12:00:00Z",
  canonical_url: "https://example.substack.com/p/hello",
  url: "https://example.substack.com/p/hello",
  reactions: { "❤": 3 },
  publishedBylines: [{ name: "Author", handle: "author" }],
  cover_image: "https://example.com/cover.jpg",
  truncated_body_text: "Excerpt",
  truncated_body: "Cached excerpt",
};
const profile: any = {
  id: 1,
  name: "Writer",
  handle: "writer",
  bio: "Biography",
  hasPosts: true,
  subscriberCount: "100",
};
afterEach(cleanup);
beforeEach(() => {
  useFetch.mockReturnValue({ data: [], isLoading: false });
});
test("post renders dates, byline, excerpt, hearts and link actions, then hides accessories with details", () => {
  const toggle = vi.fn();
  const ui = render(<PostItem post={post} detailsShown={false} toggleDetails={toggle} />);
  expect(screen.getByText("Jan 01, 2026")).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getByText("AuthorAuthor")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show Details" }));
  expect(toggle).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Open on Substack" }));
  expect(open).toHaveBeenCalledWith(post.canonical_url);
  fireEvent.click(screen.getByRole("button", { name: "Open Author Page on Substack" }));
  expect(open).toHaveBeenCalledWith("https://substack.com/@author");
  ui.rerender(
    <PostItem
      post={{ ...post, reactions: undefined, publishedBylines: [], canonical_url: "", cover_image: "" }}
      detailsShown={true}
      toggleDetails={toggle}
    />,
  );
  expect(screen.queryByText("Jan 01, 2026")).toBeNull();
  expect(screen.queryByRole("button", { name: "Open on Substack" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Hide Details" }));
  expect(toggle).toHaveBeenCalledTimes(2);
});
test("cached posts render dates, open links and toggle details", () => {
  const toggle = vi.fn();
  const ui = render(<CachedPostItem post={post} detailsShown={false} toggleDetails={toggle} />);
  expect(screen.getByText("Jan 01, 2026")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Open on Substack" }));
  expect(open).toHaveBeenCalledWith(post.url);
  fireEvent.click(screen.getByRole("button", { name: "Show Details" }));
  expect(toggle).toHaveBeenCalled();
  ui.rerender(
    <CachedPostItem post={{ ...post, url: "", cover_image: "" }} detailsShown={true} toggleDetails={toggle} />,
  );
  expect(screen.queryByText("Jan 01, 2026")).toBeNull();
  expect(screen.queryByRole("button", { name: "Open on Substack" })).toBeNull();
});
test("profile actions open author links and navigate to posts; missing handles and posts are handled", () => {
  const toggle = vi.fn();
  const ui = render(<ProfileItem profile={profile} detailsShown={false} toggleDetails={toggle} />);
  expect(screen.getByText("100")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show Details" }));
  expect(toggle).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Open on Substack" }));
  expect(open).toHaveBeenCalledWith("https://substack.com/@writer");
  fireEvent.click(screen.getByRole("button", { name: "Show Posts" }));
  expect(push).toHaveBeenCalled();
  ui.rerender(
    <ProfileItem
      profile={{ ...profile, handle: null, hasPosts: false, subscriberCount: "", bio: "" }}
      detailsShown={false}
      toggleDetails={toggle}
    />,
  );
  expect(screen.getByText("No posts")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Open on Substack" })).toBeNull();
  ui.rerender(<ProfileItem profile={profile} detailsShown={true} toggleDetails={toggle} />);
  expect(screen.getByRole("button", { name: "Hide Details" })).toBeTruthy();
});
test("language changes emit language codes", () => {
  const onChange = vi.fn();
  render(<LanguageDropdown onLanguageChange={onChange} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
  expect(onChange).toHaveBeenCalledWith("en");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
  expect(onChange).toHaveBeenCalledWith("");
});
test.each([SearchPosts, SearchProfiles])("search loading, empty query and no results", async (Command) => {
  vi.useFakeTimers();
  const ui = render(<Command />);
  expect(screen.getByText(Command === SearchPosts ? "Search Posts" : "Search Profile")).toBeTruthy();
  useFetch.mockReturnValue({ data: [], isLoading: true });
  ui.rerender(<Command />);
  expect(screen.getByText("Searching...")).toBeTruthy();
  useFetch.mockReturnValue({ data: [], isLoading: false });
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "hello" } });
  act(() => vi.advanceTimersByTime(1100));
  screen.getByText(Command === SearchPosts ? "No posts found" : "No profiles found");
});
test.each([SearchPosts, SearchProfiles])("search results and detail actions", async (Command) => {
  vi.useFakeTimers();
  useFetch.mockReturnValue({
    data: [Command === SearchPosts ? post : { ...profile, _id: "1_writer" }],
    isLoading: false,
  });
  render(<Command />);
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "hello" } });
  act(() => vi.advanceTimersByTime(1100));
  screen.getByRole("heading", { name: Command === SearchPosts ? "Post title" : "Writer" });
  fireEvent.click(screen.getByRole("button", { name: "Show Details" }));
  expect(screen.getByRole("button", { name: "Hide Details" })).toBeTruthy();
});
test.each([ProfilePosts, CachedProfilePosts])("profile post lists toggle all details", (Command) => {
  useFetch.mockReturnValue({ data: [post], isLoading: false });
  render(<Command userId={1} handle="writer" />);
  expect(screen.getByRole("heading", { name: "Post title" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show Details" }));
  expect(screen.getByRole("button", { name: "Hide Details" })).toBeTruthy();
});
test("profile navigation waits for HEAD, selects cache, and falls back to profile posts on failure", async () => {
  useFetch.mockReturnValue({ data: false, isLoading: true });
  const ui = render(<UserProfilePosts profile={profile} />);
  expect(ui.container.querySelector('[data-loading="true"]')).toBeTruthy();
  // Cache probe and cached list share a URL, so distinguish HEAD at the external boundary.
  useFetch.mockImplementation((...args: any[]) =>
    args[1]?.method === "HEAD" ? { data: true, isLoading: false } : { data: [post], isLoading: false },
  );
  ui.rerender(<UserProfilePosts profile={profile} />);
  expect(screen.getByText(/Cached excerpt/)).toBeTruthy();
  const error = new Error("public request failed");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  useFetch.mockImplementation((...args: any[]) =>
    args[1]?.method === "HEAD" ? { data: false, isLoading: false, error } : { data: [post], isLoading: false },
  );
  ui.rerender(<UserProfilePosts profile={{ ...profile, handle: null }} />);
  await waitFor(() => expect(log).toHaveBeenCalledWith(error));
  expect(screen.getByText(/Excerpt/)).toBeTruthy();
});
