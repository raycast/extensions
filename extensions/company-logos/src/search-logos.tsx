import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  Toast,
  closeMainWindow,
  environment,
  showHUD,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useRef, useState } from "react";
import { join } from "node:path";
import { companies, Company } from "./companies";
import { getLogoURL, parseDomain } from "./domains";
import { createError } from "./errors";
import { getLogoFile } from "./logos";

/** Search the curated catalog or resolve a custom domain without an API key. */
export default function Command() {
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isBusy = useRef(false);
  const domain = parseDomain(search);
  const terms = search.trim().toLowerCase().split(/\s+/);
  const matches = companies.filter((company) => {
    const haystack = [company.name, company.domain, ...(company.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return (
      company.domain === domain ||
      terms.every((term) => haystack.includes(term))
    );
  });
  const hasCustomDomain =
    domain && !companies.some((company) => company.domain === domain);

  async function transferLogo({
    company,
    shouldPaste,
  }: {
    company: Company;
    shouldPaste: boolean;
  }) {
    if (isBusy.current) {
      return;
    }
    isBusy.current = true;
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Loading ${company.name} logo…`,
    });
    try {
      const file = await getLogoFile({
        domain: company.domain,
        cachePath: join(environment.supportPath, "logos"),
      });
      if (shouldPaste) {
        // Restore focus before pasting a file into the previous app.
        // https://developers.raycast.com/api-reference/window-and-search-bar#closemainwindow
        await toast.hide();
        await closeMainWindow();
        await Clipboard.paste({ file });
        await showHUD(`${company.name} logo pasted`);
      } else {
        await Clipboard.copy({ file });
        toast.style = Toast.Style.Success;
        toast.title = "Logo copied";
        toast.message = company.name;
      }
    } catch (cause) {
      const error = createError({
        status: 500,
        message: "Could not transfer logo",
        why: String(cause),
        fix: "Check your connection and try again",
      });
      let title = error.message;
      let message = error.fix;
      if (cause instanceof Error && "fix" in cause) {
        title = cause.message;
        message = String(cause.fix);
      }
      // A fresh toast becomes a HUD when the main window has already closed.
      // https://developers.raycast.com/api-reference/feedback/toast#showtoast
      await showToast({ style: Toast.Style.Failure, title, message });
      console.error(error);
    } finally {
      isBusy.current = false;
      setIsLoading(false);
    }
  }

  function renderCompany(company: Company) {
    return (
      <Grid.Item
        key={company.domain}
        id={company.domain}
        title={company.name}
        subtitle={company.domain}
        content={{ source: getLogoURL(company.domain), fallback: Icon.Globe }}
        actions={
          <ActionPanel>
            <Action
              title="Copy Logo"
              icon={Icon.Clipboard}
              onAction={() => transferLogo({ company, shouldPaste: false })}
            />
            <Action
              title="Paste Logo"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => transferLogo({ company, shouldPaste: true })}
            />
            <Action.CopyToClipboard
              title="Copy Logo URL"
              content={getLogoURL(company.domain)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.OpenInBrowser
              title="Open Website"
              url={`https://${company.domain}`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search companies or enter a domain…"
      navigationTitle="Company Logos"
    >
      <Grid.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Find a logo by domain"
        description="Try a company name, stripe.com, or a website URL."
      />
      {hasCustomDomain && (
        <Grid.Section title="Website Logo">
          {renderCompany({ name: domain, domain })}
        </Grid.Section>
      )}
      <Grid.Section
        title="Popular Companies"
        subtitle={`${matches.length} logos`}
      >
        {matches.map(renderCompany)}
      </Grid.Section>
    </Grid>
  );
}
