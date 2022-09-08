import { Topic, Reply } from "../api/types";
import { getUnixFromNow } from "./time";

const SEPARATOR = `\n\n------\n\n`;
const LINE_BREAK = `\n\n`;

const Code = (content: string) => `\`${content}\``;
const Bold = (content: string) => `**${content}**`;
const Link = (title: string, url: string) => `[${title}](${url})`;
const Image = (alt: string, url: string) => `![${alt}](${url})`;
const Heading = (level: number, content: string) => {
  level = Math.max(1, Math.min(6, level));
  return `${"#".repeat(level)} ${content}`;
};

const OP = (isOP: boolean) => {
  return isOP ? ` ${Code("OP")} ` : "";
};

const getTopicMarkdownContent = (topic: Topic, replies: Reply[], includeHeader = true) => {
  const topicTitle = `${Heading(1, topic.title)}`;
  const topicMember = `${Code(topic.node.title)} · ${Bold(
    Link(topic.member.username, topic.member.url)
  )} · ${getUnixFromNow(topic.created)}`;
  const header = `${topicTitle}${LINE_BREAK}${topicMember}`;

  const topicContent = `${topic.content}`;

  const repliesContent = replies
    .map((reply) => getReplyMarkdownContent(reply, topic.member.id === reply.member.id))
    .join(LINE_BREAK);

  return (includeHeader ? [header, topicContent, repliesContent] : [topicContent, repliesContent]).join(SEPARATOR);
};

const getReplyMarkdownContent = (reply: Reply, isOP = false) => {
  const replyMember = `${Bold(Link(reply.member.username, reply.member.url))} ${OP(isOP)} ${getUnixFromNow(
    reply.created
  )}`;
  const replyContent = `${reply.content}`;
  return `${replyMember}${LINE_BREAK}${replyContent}`;
};

export { getTopicMarkdownContent, getReplyMarkdownContent };
