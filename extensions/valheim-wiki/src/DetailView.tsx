import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import * as cheerio from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";

interface State {
  markdown?: string;
}

function DetailView({ link }: { link: string }) {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchContent() {
      try {
        // get DOM from Link
        const $ = await cheerio.fromURL(link);

        // remove navbox from main content
        $(".navbox").remove();
        // remove crafting level tabs
        $(".wds-tab__content").not(".wds-is-current").remove();
        // remove crafting level tab buttons
        $(".wds-tabs__wrapper").remove();
        // remove edit buttons
        $(".mw-editsection").remove();

        // remove links
        $("a").attr("href", "");

        // get remaining main content
        const html = $(".mw-parser-output").html() ?? "";

        // Create a new instance of the NodeHtmlMarkdown class
        const nhm = new NodeHtmlMarkdown();
        // { ignore: ['ASIDE'] },

        // Translate the HTML to Markdown
        const markdown = nhm.translate(html);

        setState({ markdown: markdown });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: "Content could not be loaded..." });
      }
    }

    fetchContent();
  }, []);

  return <List.Item.Detail markdown={state.markdown} />;
}

export default DetailView;
