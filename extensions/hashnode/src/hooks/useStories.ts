import { preferences, showToast, ToastStyle } from "@raycast/api";
import { Story } from "models/Story";
import { StoryType } from "models/StoryType";
import { GET_PUBLIC_STORIES, GET_USER_STORIES } from "queries";
import { useEffect, useState } from "react";
import { gql } from "utils";

export default function useStories(type: StoryType) {
  const username = preferences.username?.value as string;
  const [stories, setStories] = useState<Story[] | null>(null);

  useEffect(() => {
    const getStories = async () => {
      if (type) {
        try {
          let result: Story[] = [];
          if (type === StoryType.USER) {
            const { user } = await gql<{ user: { publication: { posts: Story[] } } }>(GET_USER_STORIES, { username });
            if (user?.publication?.posts) {
              result = user.publication.posts;
            }
          } else {
            const { storiesFeed } = await gql<{ storiesFeed: Story[] }>(GET_PUBLIC_STORIES, { type });
            result = storiesFeed;
          }
          setStories(result);
        } catch (err) {
          console.log(err);
          showToast(ToastStyle.Failure, "Failed loading stories");
          setStories([]);
        }
      }
    };

    getStories();
  }, [type]);

  return stories;
}
