import { getPreferenceValues, Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { DanbooruListProps, PostDetailsProps, PostProps } from "../types/types";
import { ListActions } from "./listActions";
import Style = Toast.Style;

export default function DanbooruList(props: DanbooruListProps) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function fetchPosts() {
    const preferences = getPreferenceValues();
    const login = preferences.username;
    const apiKey = preferences.apiKey;
    const postsUrl = props.sfw
      ? `https://danbooru.donmai.us/posts.json?login=${login}&api_key=${apiKey}&tags=${props.tag1}+${props.tag2}+rating%3Ag&limit=${props.numberOfPosts}`
      : `https://danbooru.donmai.us/posts.json?login=${login}&api_key=${apiKey}&tags=${props.tag1}+${props.tag2}&limit=${props.numberOfPosts}`;

    try {
      const response = await fetch(postsUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const posts: PostProps[] = (await response.json()) as PostProps[];
      setPosts(posts);
    } catch (error) {
      if (error instanceof Error) {
        showToast({
          title: "Error",
          style: Style.Failure,
          message: error.message + ". Did you correctly set up your API Key ?",
        });
      } else {
        showToast({ title: "Error", style: Style.Failure, message: "An unknown error occurred" });
      }
    }
    setIsLoading(false);
  }

  useEffect(() => {
    async function fetchData() {
      await fetchPosts();
    }
    fetchData();
  }, [props.tag1, props.tag2, props.numberOfPosts]);

  return (
    <Grid isLoading={isLoading}>
      {!isLoading &&
        posts.map((post, index) => {
          const postDetails: PostDetailsProps = {
            post: {
              id: post.id,
              file_url: post.file_url,
              tag_string: post.tag_string_general,
              rating: post.rating,
              created_at: post.created_at,
              artist: post.tag_string_artist,
              copyright: post.tag_string_copyright,
              character: post.tag_string_character,
            },
          };
          return (
            <Grid.Item
              key={index}
              title={post.tag_string_general || post.id.toString()}
              content={post.preview_file_url} // smaller, more compressed version of the file_url
              actions={<ListActions {...postDetails} />}
            />
          );
        })}
    </Grid>
  );
}
