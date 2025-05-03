import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from "node-html-markdown";
import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL, FETCH_EMAIL } from "./utils/endPoints";

type EmailDataType = {
  mail_id: string;
  mail_from: string;
  mail_recipient: string;
  mail_subject: string;
  mail_excerpt: string;
  mail_body: string;
  mail_timestamp: string;
  mail_date: string;
  mail_read: string;
  content_type: string;
  source_id: string;
  source_mail_id: string;
  reply_to: string;
  mail_size: string;
  ver: string;
  ref_mid: string;
  sid_token: string;
  auth: {
    success: boolean;
    error_codes: string[];
  };
};

export default function Mail({ email_id, sid_token }: { email_id: string; sid_token: string }) {
  const url = `${BASE_URL}${FETCH_EMAIL}&email_id=${email_id}`;
  const { isLoading, data } = useFetch<EmailDataType>(url, {
    headers: {
      Cookie: "PHPSESSID=" + sid_token,
    },
    mapResult: (data) => ({ data }),
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        data?.mail_body &&
        `From:  ${data.mail_from} \n\n Subject: ${data.mail_subject || "No Subject"} \n\n Date: ${data.mail_date} \n\n --- \n\n ${htmlToMarkdown(data.mail_body)}`
      }
    />
  );
}

export const htmlToMarkdown = (html: string): string => {
  const options: NodeHtmlMarkdownOptions = {
    preferNativeParser: false,
    codeFence: "```",
    bulletMarker: "*",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
    strikeDelimiter: "~~",
    maxConsecutiveNewlines: 2,
    keepDataImages: true,
    useLinkReferenceDefinitions: true,
    useInlineLinks: true,
    lineStartEscape: [/^>/, "\\>"],
    globalEscape: [/^>/, "\\>"],
    textReplace: [
      [/\s+/g, " "],
      [/\s+$/, ""],
      [/^\s+/, ""],
      [/ {2,}/g, " "],
    ],
    ignore: ["script", "style", "head", "title", "meta", "link", "object", "iframe", "svg", "math", "pre"],
    blockElements: ["div", "p", "form", "table", "ul", "ol", "dl", "blockquote", "address", "math", "pre"],
  };

  return NodeHtmlMarkdown.translate(html, options);
};
