import { Reply, Member, Node } from "@/types/v2ex";
import { getUnixFromNow } from "./time";

export const Code = (content: string) => `\`${content}\``;
export const Bold = (content: string) => `**${content}**`;
const Link = (title: string, url: string) => `[${title}](${url})`;
export const Quote = (content: string) => `> ${content}`;
export const Heading = (level: number, content: string) => {
  level = Math.max(1, Math.min(6, level));
  return `${"#".repeat(level)} ${content}`;
};
const OP = (isOP: boolean) => {
  return isOP ? ` ${Code("OP")} ` : "";
};
const SEPARATOR = `\n\n------\n\n`;
const LINE_BREAK = `\n\n`;
const LOADING = Code("Loading...");

export const getTopicMarkdown = ({
  member,
  node,
  replies,
  title,
  content,
  created,
}: {
  member?: Member;
  node?: Node;
  replies?: Reply[];
  title: string;
  content: string;
  created: number;
}) => {
  const topicTitle = `${Heading(1, title)}`;

  const topicNode = node && `${Code(node.title)}`;
  const topicMember = member && `${Bold(Link(member.username, member.url))}`;
  const topicCreated = `${getUnixFromNow(created)}`;
  const topicInfo = [topicNode, topicMember, topicCreated].filter((item) => item).join(" · ");

  const topicContent = !content ? SEPARATOR : `${SEPARATOR}${content}${SEPARATOR}`;

  const topicReplies = replies
    ? replies.length === 0
      ? Quote("No Comments Yet")
      : replies.map((reply) => getReplyMarkdown(reply, { isOP: member?.id === reply.member.id })).join(LINE_BREAK)
    : LOADING;

  return [topicTitle, topicInfo, topicContent, topicReplies].join(LINE_BREAK);
};

const getReplyMarkdown = (reply: Reply, options: { isOP: boolean }) => {
  const replyMember = `${Link(reply.member.username, reply.member.url)} ${OP(options.isOP)}`;
  const replyCreate = `${getUnixFromNow(reply.created)}`;
  const replyInfo = [replyMember, replyCreate].filter((item) => item).join(" ");

  const replyContent = `${reply.content}`;

  return [replyInfo, replyContent].join(LINE_BREAK);
};
