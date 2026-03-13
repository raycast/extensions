import { List } from "@raycast/api";
import { CommentReplyView, PersonMentionView } from "lemmy-js-client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getReplies } from "./utils/replies";
import { createContext } from "react";
import ReplyItem from "./components/ReplyItem";
import { getMentions } from "./utils/mentions";
import MentionItem from "./components/MentionItem";

export const RepliesContext = createContext(
  {} as {
    replies: CommentReplyView[];
    setReplies: Dispatch<SetStateAction<CommentReplyView[]>>;
  }
);

export const MentionsContext = createContext(
  {} as {
    mentions: PersonMentionView[];
    setMentions: Dispatch<SetStateAction<PersonMentionView[]>>;
  }
);

const Notifications = () => {
  const [loading, setLoading] = useState<boolean>(true);

  const [replies, setReplies] = useState<CommentReplyView[]>([]);
  const [mentions, setMentions] = useState<PersonMentionView[]>([]);

  const [searchText, setSearchText] = useState<string>("");

  const init = async () => {
    setReplies(await getReplies());
    setMentions(await getMentions());

    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!searchText) {
      init();
      return;
    }
    if (!replies && !mentions) return;

    // search reply authors, contents and posts
    const filteredReplies = replies.filter(
      (reply) =>
        reply.creator.name.toLowerCase().includes(searchText.toLowerCase()) ||
        reply.comment.content.toLowerCase().includes(searchText.toLowerCase()) ||
        reply.post.body?.toLowerCase().includes(searchText.toLowerCase())
    );

    const filteredMentions = mentions.filter((mention) =>
      mention.creator.name.toLowerCase().includes(searchText.toLowerCase())
    );

    setReplies(filteredReplies);
    setMentions(filteredMentions);
  }, [searchText]);

  return (
    <>
      <List
        isLoading={loading}
        navigationTitle="Search Lemmy Notifications"
        searchBarPlaceholder="Search notification authors, comments and posts"
        onSearchTextChange={setSearchText}
        isShowingDetail
      >
        {replies.length > 0 && (
          <RepliesContext.Provider value={{ replies, setReplies }}>
            <List.Section title="Replies">
              {replies.map((reply) => (
                <ReplyItem key={reply.comment.id} reply={reply} />
              ))}
            </List.Section>
          </RepliesContext.Provider>
        )}
        {mentions.length > 0 && (
          <MentionsContext.Provider value={{ mentions, setMentions }}>
            <List.Section title="Mentions">
              {mentions.map((mention) => (
                <MentionItem key={mention.person_mention.id} mention={mention} />
              ))}
            </List.Section>
          </MentionsContext.Provider>
        )}
      </List>
    </>
  );
};

export default Notifications;
