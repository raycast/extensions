import { ActionPanel, Action, showToast, List, Detail, Icon } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { homedir } from "os";
import removeMd from "remove-markdown";
import { existsSync } from "fs";
import snarkdown from "snarkdown";
import { join } from "path";
import PileOperations from "./utils/fileOperations";
import { HighlightI, NoteI, PilePost, PileSettings } from "./utils/types";

import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import CreatePileAction from "./components/actions/CreatePileAction";
import CreatePostAction from "./components/actions/CreatePostAction";
import { renderHighlightColor } from "./helpers";

const defaultPost = {
  content: "",
  data: {
    title: "",
    createdAt: null,
    updatedAt: null,
    highlight: null,
    highlightColor: "transparent",
    tags: [],
    replies: [],
    attachments: [],
    isReply: false,
    isAI: false,
  },
};

interface PileState {
  isLoading: boolean;
  filter: PileSettings | null;
  searchText: string;
  currentPile: PileSettings | null;
  posts: PilePost[];
}

export default function Command() {
  const [state, setState] = useState<PileState>({
    isLoading: true,
    filter: null,
    searchText: "",
    currentPile: null,
    posts: [],
  });

  const pilesRef = useRef<PileSettings[] | null>(null);

  useEffect(() => {
    getPiles();
  }, []);

  useEffect(() => {
    if (state.filter) {
      loadPosts(state.filter.path);
    }
  }, [state.filter]);

  async function loadPosts(path: string) {
    setState((previous) => ({ ...previous, isLoading: true }));
    try {
      const posts = await PileOperations.readFile(join(path, "index.json"));
      const parsedPosts = JSON.parse(posts as string);

      let postContentHolder: PilePost[] = [];
      // Use map to create an array of promises
      const promises = parsedPosts.map(async (post: NoteI) => {
        const postPath = join(path, post[0]);

        // Check if the file exists
        if (!existsSync(postPath)) {
          return null; // Skip this iteration
        }

        const postContent = await PileOperations.readFile(join(path, post[0] as string));
        const parsedPostContent = PileOperations.generateJSONFileFromMarkdown(String(postContent));

        const file = await unified()
          .use(rehypeParse)
          .use(rehypeRemark)
          .use(remarkStringify)
          .process(parsedPostContent.content);

        const title = removeMd(String(file)).split("\n")[0];

        return { ...parsedPostContent, data: { ...parsedPostContent.data, title }, excerpt: String(file) };
      });

      // Wait for all promises to resolve
      postContentHolder = await Promise.all(promises);

      setState((previous) => ({ ...previous, posts: postContentHolder, isLoading: false }));
    } catch (e) {
      // can't decode posts
      setState((previous) => ({ ...previous, posts: [], isLoading: false }));
    }
  }

  async function getPiles() {
    const filePath = join(homedir(), "Piles", "piles.json");
    const verify = await PileOperations.verifyConfigFilePath();
    if (!verify) {
      setState((previous) => ({ ...previous, filter: null, currentPile: null }));
    }
    const data = PileOperations.readFile(filePath) as Promise<string>;
    const tempData = await data;
    const parsedData = JSON.parse(tempData.toString());

    // TODO: check localstorage/cache for last saved pile and load that else load first pile

    setState((previous) => ({ ...previous, filter: parsedData[0] || {}, currentPile: parsedData[0] || {} }));
    pilesRef.current = parsedData;

    if (!parsedData || parsedData.length === 0) {
      setState({ ...state, isLoading: false });
      return;
    }

    PileOperations.setLocalStorage("piles", tempData.toString());

    await loadPosts(parsedData[0].path);
  }

  async function savePost(post: PilePost, path: string = "") {
    // Convert markdown to html
    const html = snarkdown(post.content);
    const date = new Date();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear().toString();

    const postPath = `${path}/${year}/${month}`;
    const content = post.content;
    const title = removeMd(String(content)).split("\n")[0];

    setState((previous) => ({
      ...previous,
      posts: [
        {
          content,
          data: {
            ...post.data,
            title,
          },
          excerpt: content,
        },
        ...previous.posts,
      ],
      searchText: "",
    }));
    try {
      const fileContents = PileOperations.generateMarkdownFile(html, post.data || "");
      await PileOperations.createDirectory(postPath);
      await PileOperations.saveFile(path, fileContents, true);
      await PileOperations.addFileToIndex(path, post.data);
    } catch (error) {
      console.log(error);
    }
  }

  async function createPile(name: string, theme: "light" | "dark", path: string) {
    const filePath = join(homedir(), "Piles", "piles.json");
    const data = PileOperations.readFile(filePath) as Promise<string>;
    const tempData = await data;
    const parsedData = JSON.parse(tempData.toString());

    const newPile = {
      name,
      theme,
      path: path + "/" + name,
    };

    const newPiles = [...parsedData, newPile];

    await PileOperations.createDirectory(path + "/" + name);
    await PileOperations.saveFile(filePath, JSON.stringify(newPiles));
    await PileOperations.saveFile(join(path + "/" + name, "index.json"), JSON.stringify([]));
    pilesRef.current = [...(pilesRef?.current ?? []), newPile];
    setState((previous) => ({ ...previous, filter: newPile, currentPile: newPile }));
  }

  const handleCreate = useCallback(
    (name: string, theme: "light" | "dark", path: string) => {
      createPile(name, theme, path);
      const newPile = {
        name,
        theme,
        path,
      };
      setState((previous) => ({ ...previous, currentPile: newPile, filter: newPile }));
    },
    [setState],
  );

  const handleCreatePost = useCallback(
    (content: string, highlight: HighlightI) => {
      const data = {
        ...defaultPost.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        highlight: highlight.highlight,
        highlightColor: highlight.highlightColor === "transparent" ? null : highlight.highlightColor,
      };

      savePost({ content, data }, state.filter?.path);
      showToast({ title: "Post created" });
    },
    [setState, state.posts, state.filter?.path],
  );

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      filtering
      searchBarPlaceholder="Search through your posts"
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Pile"
          value={state.filter?.path || "Select a pile"}
          onChange={(newValue) => {
            const pile = pilesRef?.current?.find((pile: PileSettings) => pile.path === newValue);
            setState((previous) => ({ ...previous, currentPile: pile || null, filter: pile || null }));
          }}
        >
          {pilesRef?.current &&
            pilesRef?.current?.map((pile: PileSettings, index: number) => (
              <List.Dropdown.Item value={pile.path} title={pile.name} key={index} />
            ))}
        </List.Dropdown>
      }
    >
      <EmptyView
        filter={state.filter}
        searchText={state.searchText}
        piles={pilesRef.current}
        onCreate={handleCreatePost}
        onPileCreate={handleCreate}
      />
      {state.posts.map((post: PilePost, index: number) => (
        <List.Item
          key={index}
          icon={{ source: Icon.CircleFilled, tintColor: renderHighlightColor(post?.data?.highlight || "transparent") }}
          title={post?.data?.title || ""}
          actions={
            <ActionPanel>
              <Action.Push title="Open Post" icon={Icon.Sidebar} target={<Detail markdown={post?.excerpt || ""} />} />
              <ActionPanel.Section>
                <CreatePileAction onCreate={handleCreate} />
                <CreatePostAction onCreate={handleCreatePost} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EmptyView({
  piles,
  searchText,
  filter,
  onCreate,
  onPileCreate,
}: {
  piles: PileSettings[] | null;
  searchText: string;
  filter: PileSettings | null;
  onCreate: (content: string, highlight: HighlightI) => void;
  onPileCreate: (name: string, theme: "light" | "dark", path: string) => void;
}) {
  if (piles?.length === 0) {
    return (
      <List.EmptyView
        icon="📚"
        title="No Piles found"
        description="Create a new pile to get started"
        actions={
          <ActionPanel>
            <CreatePileAction onCreate={onPileCreate} />
          </ActionPanel>
        }
      />
    );
  } else
    return (
      <List.EmptyView
        icon="📝"
        title={searchText ? `No results for "${searchText}"` : `No posts in ${filter?.name}`}
        description="Create a post to get started"
        actions={
          <ActionPanel>
            <CreatePostAction onCreate={onCreate} />
          </ActionPanel>
        }
      />
    );
}
