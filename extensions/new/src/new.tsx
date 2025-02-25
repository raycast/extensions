import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

interface NewLink {
  domain: string;
  description: string;
  company: string;
  category: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredLinks, setFilteredLinks] = useState<NewLink[]>([]);

  const links = useMemo(() => {
    return [
      // Developer Tools
      {
        domain: "adalo.new",
        company: "Adalo",
        description: "Build a personalized app for mobile and desktop using Adalo.",
        category: "Developer Tools",
      },
      {
        domain: "ai.new",
        company: "ai.new",
        description: "Create code using Python.",
        category: "Developer Tools",
      },
      {
        domain: "ar.new",
        company: "Aircards",
        description: "Easily create and deploy WebAR activation codes to use on your next augmented reality project.",
        category: "Developer Tools",
      },
      {
        domain: "alchemy.new",
        company: "Alchemy",
        description: "Build a blockchain app using Alchemy.",
        category: "Developer Tools",
      },
      {
        domain: "floorplan.new",
        company: "Archilogic",
        description: "Design a new digital floor plan using Archilogic.",
        category: "Developer Tools",
      },
      {
        domain: "admin.new",
        company: "Basetool",
        description: "Create a tool framework in Basetool.",
        category: "Developer Tools",
      },
      {
        domain: "data.new",
        company: "Bit.io",
        description: "Upload data to your Bit.io cloud database.",
        category: "Developer Tools",
      },
      {
        domain: "query.new",
        company: "bit.io",
        description: "Easily query bit.io data repositories.",
        category: "Developer Tools",
      },
      {
        domain: "link.new",
        company: "BL.INK",
        description: "Create a short link using BL.INK.",
        category: "Developer Tools",
      },
      {
        domain: "bugs.new",
        company: "bugs",
        description: "Report bugs and other issues to the open-source Chromium browser project.",
        category: "Developer Tools",
      },
      // Productivity
      {
        domain: "docs.new",
        company: "Google",
        description: "Create a new document using Google Docs.",
        category: "Productivity",
      },
      {
        domain: "sheets.new",
        company: "Google",
        description: "Create a new spreadsheet using Google Sheets.",
        category: "Productivity",
      },
      {
        domain: "slides.new",
        company: "Google",
        description: "Create a new presentation using Google Slides.",
        category: "Productivity",
      },
      {
        domain: "forms.new",
        company: "Google",
        description: "Create a new form using Google Forms.",
        category: "Productivity",
      },
      {
        domain: "meeting.new",
        company: "Google",
        description: "Schedule a new Google Calendar event.",
        category: "Productivity",
      },
      {
        domain: "keep.new",
        company: "Google",
        description: "Create a new note in Google Keep.",
        category: "Productivity",
      },
      {
        domain: "script.new",
        company: "Google",
        description: "Create and share new editor functions using Google App Script.",
        category: "Productivity",
      },
      // Creative Tools
      {
        domain: "design.new",
        company: "Canva",
        description: "Create a new design using Canva.",
        category: "Creative Tools",
      },
      {
        domain: "resume.new",
        company: "Canva",
        description: "Create a professional-looking resume using templates from Canva.",
        category: "Creative Tools",
      },
      {
        domain: "invite.new",
        company: "Canva",
        description: "Create an invitation using beautiful, customizable templates from Canva.",
        category: "Creative Tools",
      },
      {
        domain: "menu.new",
        company: "Canva",
        description: "Design an appetizing menu using customizable templates from Canva.",
        category: "Creative Tools",
      },
      {
        domain: "flyer.new",
        company: "Canva",
        description: "Create a flyer using beautiful, customizable templates from Canva.",
        category: "Creative Tools",
      },
      // GitHub Tools
      {
        domain: "repo.new",
        company: "GitHub",
        description: "Create a new GitHub repository.",
        category: "GitHub Tools",
      },
      {
        domain: "gist.new",
        company: "GitHub",
        description: "Create a new GitHub Gist.",
        category: "GitHub Tools",
      },
      {
        domain: "codespace.new",
        company: "GitHub",
        description: "Create a new GitHub Codespace.",
        category: "GitHub Tools",
      },
      // Development Environments
      {
        domain: "react.new",
        company: "CodeSandbox",
        description: "Create a new React project online with CodeSandbox.",
        category: "Development Environments",
      },
      {
        domain: "js.new",
        company: "CodeSandbox",
        description: "Create a new Javascript project online with CodeSandbox.",
        category: "Development Environments",
      },
      {
        domain: "vue.new",
        company: "CodeSandbox",
        description: "Create a new vue.js project online with CodeSandbox.",
        category: "Development Environments",
      },
      {
        domain: "ts.new",
        company: "CodeSandbox",
        description: "Create a new Typescript project online with CodeSandbox.",
        category: "Development Environments",
      },
      {
        domain: "angular.new",
        company: "CodeSandbox",
        description: "Create a new Angular project online CodeSandbox.",
        category: "Development Environments",
      },
      {
        domain: "github.new",
        company: "GitHub",
        description: "Create a new GitHub repository.",
        category: "GitHub Tools",
      },
      {
        domain: "gitlab.new",
        company: "Gitlab",
        description: "Create a blank project on GitLab.",
        category: "Development Environments",
      },
      {
        domain: "webflow.new",
        company: "Webflow",
        description: "Design, build, and launch websites visually.",
        category: "Development Environments",
      },
      {
        domain: "ionic.new",
        company: "Ionic",
        description: "Building high quality, cross-platform native and web app experiences with Ionic.",
        category: "Development Environments",
      },
    ].map((link) => ({
      ...link,
      category:
        link.category ||
        (link.company === "Google"
          ? "Productivity"
          : link.company === "Canva"
            ? "Creative Tools"
            : link.company === "GitHub"
              ? "GitHub Tools"
              : link.company === "CodeSandbox"
                ? "Development Environments"
                : "Developer Tools"),
    }));
  }, []);

  // Filter links based on search text
  useEffect(() => {
    const filtered = links.filter((link) => {
      const searchContent = `${link.domain} ${link.company} ${link.description} ${link.category}`.toLowerCase();
      return searchContent.includes(searchText.toLowerCase());
    });
    setFilteredLinks(filtered);
  }, [searchText, links]);

  // Group filtered links by category
  const groupedLinks = useMemo(() => {
    return filteredLinks.reduce(
      (acc, link) => {
        const category = link.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(link);
        return acc;
      },
      {} as Record<string, NewLink[]>,
    );
  }, [filteredLinks]);

  // Sort categories and only show non-empty ones
  const sortedCategories = useMemo(() => {
    const categories = [
      "Developer Tools",
      "Productivity",
      "Creative Tools",
      "GitHub Tools",
      "Development Environments",
    ];
    return categories.filter((category) => groupedLinks[category]?.length > 0);
  }, [groupedLinks]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search domains, companies, or descriptions..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          defaultValue="all"
          onChange={(newValue) => {
            if (newValue === "all") {
              setFilteredLinks(links);
            } else {
              setFilteredLinks(links.filter((link) => link.category === newValue));
            }
          }}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Item title="Developer Tools" value="Developer Tools" />
          <List.Dropdown.Item title="Productivity" value="Productivity" />
          <List.Dropdown.Item title="Creative Tools" value="Creative Tools" />
          <List.Dropdown.Item title="GitHub Tools" value="GitHub Tools" />
          <List.Dropdown.Item title="Development Environments" value="Development Environments" />
        </List.Dropdown>
      }
    >
      {sortedCategories.map((category) => (
        <List.Section key={category} title={category}>
          {groupedLinks[category]?.map((link) => (
            <List.Item
              key={link.domain}
              icon={Icon.Link}
              title={link.domain}
              subtitle={link.company}
              accessories={[{ text: link.description }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Link" url={`https://${link.domain}`} />
                  <Action.CopyToClipboard title="Copy Link" content={`https://${link.domain}`} />
                  <Action.OpenInBrowser title="Open Google whats.new" url={`https://whats.new/shortcuts/`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
