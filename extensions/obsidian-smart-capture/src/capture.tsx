import {
  Action,
  ActionPanel,
  AI,
  closeMainWindow,
  Color,
  environment,
  Form,
  getSelectedText,
  Icon,
  List,
  LocalStorage,
  open,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { useEffect, useState } from "react";

import { YoutubeTranscript } from "youtube-transcript";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { GET_ACTIVE_APP_SCRIPT, GET_LINK_FROM_BROWSER_SCRIPT, SUPPORTED_BROWSERS } from "./scripts/browser";
import { SUMMARY_PROMPT } from "./utils/constants";

import { urlToMarkdown, useObsidianVaults, vaultPluginCheck } from "./utils/utils";

export default function Capture() {
  const canAccessAI = environment.canAccess(AI);
  const { ready, vaults: allVaults } = useObsidianVaults();
  const [vaultsWithPlugin] = vaultPluginCheck(allVaults, "obsidian-advanced-uri");

  const [defaultVault, setDefaultVault] = useState<string | undefined>(undefined);
  const [defaultPath, setDefaultPath] = useState<string | undefined>(undefined);

  LocalStorage.getItem("vault").then((savedVault) => {
    if (savedVault) setDefaultVault(savedVault.toString());
  });

  LocalStorage.getItem("path").then((savedPath) => {
    if (savedPath) setDefaultPath(savedPath.toString());
    else setDefaultPath("inbox");
  });

  const formatData = (
    content?: string,
    link?: string,
    highlight?: string,
    includePageContents = false,
    includeSummary = false
  ) => {
    const data = [];
    if (content) {
      data.push(content);
    }
    if (link) {
      data.push(`[${resourceInfo}](${link})`);
    }
    if (highlight) {
      data.push(`> ${selectedText}`);
    }
    if (includeSummary) {
      data.push(`---\n\n${summary}\n\n---`);
    }
    if (includePageContents) {
      data.push(pageContent);
    }
    return data.join("\n\n");
  };

  async function createNewNote({ fileName, content, link, vault, path, highlight }: Form.Values) {
    try {
      if (vault) await LocalStorage.setItem("vault", vault);
      if (path) await LocalStorage.setItem("path", path);

      const target = `obsidian://advanced-uri?vault=${encodeURIComponent(vault)}&filepath=${encodeURIComponent(
        path
      )}/${encodeURIComponent(fileName)}&data=${encodeURIComponent(
        formatData(content, link, highlight, includePageContents, includeSummary)
      )}`;
      open(target);
      popToRoot();
      closeMainWindow();
      showHUD("Note Captured", { clearRootSearch: true });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to capture. Try again",
      });
    }

    // Save vault and path to local storage
    await LocalStorage.setItem("vault", vault);
    await LocalStorage.setItem("path", path);

    const target = `obsidian://advanced-uri?vault=${encodeURIComponent(vault)}&filepath=${encodeURIComponent(
      path
    )}/${encodeURIComponent(fileName)}&data=${encodeURIComponent(
      formatData(content, link, highlight, includePageContents, includeSummary)
    )}`;
    open(target);
    popToRoot();
    showHUD("Note Captured", { clearRootSearch: true });
  }

  const [selectedText, setSelectedText] = useState<string>("");
  const [includeHighlight, setIncludeHighlight] = useState<boolean>(true);
  const [includeSummary, setIncludeSummary] = useState<boolean>(false);
  const [pageContent, setPageContent] = useState<string>("");
  const [pageContentMessage, setPageContentMessage] = useState<string>();
  const [summary, setSummary] = useState<string>("");
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [includePageContents, setIncludePageContents] = useState<boolean>(false);
  const [resourceInfo, setResourceInfo] = useState<string>("");

  useEffect(() => {
    const setText = async () => {
      try {
        const activeApp = await runAppleScript(GET_ACTIVE_APP_SCRIPT);
        if (SUPPORTED_BROWSERS.includes(activeApp)) {
          const linkInfoStr = await runAppleScript(GET_LINK_FROM_BROWSER_SCRIPT(activeApp));
          const [url, title] = linkInfoStr.split("\t");
          if (url && title) {
            setSelectedResource(url);
            setResourceInfo(title);
            setContent(url);
          }
        }
      } catch (error) {
        console.log(error);
      }

      try {
        const data = await getSelectedText();
        if (data) {
          setSelectedText(data);
        }
      } catch (error) {
        console.log(error);
      }
    };

    const setContent = async (url: string) => {
      try {
        if (url.includes("youtube.com")) {
          setPageContentMessage("Include video transcript");
          const captions = await YoutubeTranscript.fetchTranscript(url);
          const formattedCaptions = captions
            .map((caption) => {
              return caption.text;
            })
            .join("\n");
          setPageContent(formattedCaptions);
        } else {
          setPageContentMessage("Include page content");
          const markdown = await urlToMarkdown(url);
          setPageContent(markdown);
        }
      } catch (error) {
        console.error(error);
        showToast({
          title: "Failed to fetch page content",
          style: Toast.Style.Failure,
        });
      }
    };
    setText();
  }, []);

  useEffect(() => {
    const generateSummary = async () => {
      showToast({
        style: Toast.Style.Animated,
        title: "Generating Summary",
      });
      const summary = await AI.ask(SUMMARY_PROMPT + pageContent);
      setSummary(summary);
      if (summary) {
        showToast({
          style: Toast.Style.Success,
          title: "Summary captured",
        });
      }
    };
    if (includeSummary) {
      generateSummary();
    }
  }, [includeSummary]);

  useEffect(() => {
    if (selectedText && selectedResource) {
      showToast({
        style: Toast.Style.Success,
        title: "Highlighted text, Source captured",
      });
    } else if (selectedText) {
      showToast({
        style: Toast.Style.Success,
        title: "Highlighted text captured",
      });
    } else if (selectedResource) {
      showToast({
        style: Toast.Style.Success,
        title: "Link captured",
      });
    } else if (pageContent) {
      showToast({
        style: Toast.Style.Success,
        title: "Page contents captured",
      });
    }
  }, [selectedText, selectedResource, pageContent]);

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (allVaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaultsWithPlugin.length === 0) {
    return <AdvancedURIPluginNotInstalled />;
  } else if (vaultsWithPlugin.length >= 1) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Capture" onSubmit={createNewNote} />
            <Action
              title="Clear Capture"
              shortcut={{ modifiers: ["opt"], key: "backspace" }}
              onAction={() => {
                setResourceInfo("");
                setSelectedResource("");
                setSelectedText("");
                showToast({
                  style: Toast.Style.Success,
                  title: "Capture Cleared",
                });
              }}
            />
          </ActionPanel>
        }
      >
        {ready && vaultsWithPlugin.length >= 1 && (
          <Form.Dropdown id="vault" title="Vault" defaultValue={defaultVault}>
            {vaultsWithPlugin.map((vault) => (
              <Form.Dropdown.Item key={vault.key} value={vault.name} title={vault.name} icon="🧳" />
            ))}
          </Form.Dropdown>
        )}
        {ready && (
          <Form.TextField
            id="path"
            title="Storage Path"
            defaultValue={defaultPath}
            info="Path where newly captured notes will be saved"
          />
        )}

        <Form.TextField title="Title" id="fileName" placeholder="Title for the resource" autoFocus />

        {selectedText && (
          <Form.Checkbox
            id="highlight"
            title="Include Highlight"
            label=""
            value={includeHighlight}
            onChange={setIncludeHighlight}
          />
        )}
        {pageContent && (
          <Form.Checkbox
            id="page-contents"
            title={pageContentMessage}
            label=""
            value={includePageContents}
            onChange={setIncludePageContents}
          />
        )}
        {canAccessAI && pageContent && (
          <Form.Checkbox
            id="summary"
            title="Include AI Summary"
            label=""
            value={includeSummary}
            onChange={setIncludeSummary}
          />
        )}
        <Form.TextArea title="Note" id="content" placeholder={"Notes about the resource"} />
        {selectedResource && resourceInfo && (
          <Form.TagPicker id="link" title="Link" defaultValue={[selectedResource]}>
            <Form.TagPicker.Item
              value={selectedResource}
              title={resourceInfo}
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
            />
          </Form.TagPicker>
        )}
        {selectedText && includeHighlight && <Form.Description title="Highlight" text={selectedText} />}
      </Form>
    );
  }
}
