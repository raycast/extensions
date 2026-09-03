import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getApplications,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useState } from "react";
import { discoverScriptCommands, parseDirectoryPreference } from "./lib/discover-script-commands";
import { facetCounts, splitTypedPackage } from "./lib/convention";
import { learnedPackages, packageForTarget } from "./lib/link-command";
import { collapseHome } from "./lib/home-path";
import { fetchFavicon } from "./lib/fetch-icon";
import { brandFor, buildScript, domainOf, findPlaceholder, scriptFilename, slugify } from "./lib/generate-script";

/** Sentinel for the "New…" dropdown entry — a value no real environment or category can hold. */
const NEW_VALUE = "\u0000new";

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

type CreateInput = {
  directory: string;
  title: string;
  target: string;
  environment: string;
  packageName: string;
  category: string;
  application: string;
  desktopApplication: string;
  icon: string;
  author?: string;
  authorURL?: string;
};

/**
 * The mark a sibling command already fetched. Checked before the network: a private or intranet host is
 * invisible to any public favicon service, so without this the second command for such a service falls to
 * the generic link glyph even though the right icon already sits in the script directory.
 */
const brandIcon = async (directory: string, slug: string) =>
  (await exists(join(directory, "assets", slug, "index.png"))) ? `./assets/${slug}/index.png` : undefined;

const writeIcon = async (directory: string, slug: string, domain: string) => {
  const buffer = await fetchFavicon(domain);
  if (!buffer) return undefined;

  const assetDirectory = join(directory, "assets", slug);
  await mkdir(assetDirectory, { recursive: true });
  await writeFile(join(assetDirectory, "index.png"), buffer);

  return `./assets/${slug}/index.png`;
};

const createScript = async (input: CreateInput) => {
  const draft = {
    title: input.title.trim(),
    target: input.target.trim(),
    environment: input.environment.trim() || undefined,
    packageName: input.packageName.trim() || undefined,
    category: input.category.trim() || undefined,
    application: input.application || undefined,
    desktopApplication: input.desktopApplication || undefined,
    author: input.author,
    authorURL: input.authorURL,
  };

  const filename = scriptFilename(draft);
  const destination = join(input.directory, filename);
  if (await exists(destination)) throw new Error(`${filename} already exists — edit it directly`);

  // Keyed on the brand, so every command for a service shares one mark. Keying on the title would let a
  // second command overwrite the first's icon; keying on the filename, as this did, went too far the other
  // way and gave each command a private copy — so a service's icon was re-fetched every time and
  // byte-identical duplicates accumulated. Falls back to the filename where there is no brand to key on.
  const brandSlug = draft.packageName ? slugify(draft.packageName) : "";
  const assetKey = brandSlug || filename.replace(/\.[^.]+$/, "");
  const domain = domainOf(draft.target);
  const chosenIcon = input.icon.trim();
  const iconReference =
    chosenIcon ||
    (await brandIcon(input.directory, assetKey)) ||
    (domain ? await writeIcon(input.directory, assetKey, domain) : undefined);

  const { contents } = buildScript({ ...draft, iconReference });

  await writeFile(destination, contents, "utf8");
  await chmod(destination, 0o755);

  return destination;
};

const Command = () => {
  const preferences = getPreferenceValues<Preferences>();
  const directories = parseDirectoryPreference(preferences.scriptDirectories);

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [environment, setEnvironment] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("");
  const [packageName, setPackageName] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [application, setApplication] = useState("");
  const [desktopApplication, setDesktopApplication] = useState("");
  const [icon, setIcon] = useState("");
  const [hoisted, setHoisted] = useState("");
  const [directory, setDirectory] = useState(directories[0] ?? "");

  const { data: applications } = usePromise(getApplications);

  // The vocabulary is read off the commands already on disk rather than hard-coded, so the form
  // offers whatever convention this particular collection uses — and imposes none on a collection
  // that has no convention at all. A fresh install simply has an empty list and the New… escape.
  const { data: discovered } = usePromise(discoverScriptCommands, [preferences.scriptDirectories]);
  const facets = facetCounts(discovered?.commands ?? []);

  // Deriving a package from the domain gets the product and the casing wrong often enough to be
  // a nuisance — atlassian.net is Jira, npmjs.com is npm, my.pcloud.com is pCloud. The collection
  // already holds the right answer for every service it has seen, so it is asked first.
  const learned = learnedPackages(discovered?.commands ?? []);
  const suggestedPackage = packageForTarget(target, learned) ?? brandFor(target);

  // Mirrors the generator's own guard rather than restating it loosely: `open -a` takes no query, so a
  // search target has nothing an app could stand in for, and a folder has no web surface to fall back to.
  const canRoute = /^https?:\/\//i.test(target.trim()) && !findPlaceholder(target);

  // The dropdown holds a sentinel while a new value is being typed; everything downstream sees
  // only the resolved string.
  const chosen = (value: string, typed: string) => (value === NEW_VALUE ? typed.trim() : value);
  const chosenEnvironment = chosen(environment, newEnvironment);
  const chosenCategory = chosen(category, newCategory);

  // Resolved once, here, and passed explicitly from now on. The brand keys the icon asset as well as the
  // filename's brand segment, so two sides deriving it independently would file the mark under one slug
  // while the subtitle claimed another.
  const resolvedPackage = packageName.trim() || suggestedPackage || "";

  /**
   * A hoisted value this collection has never seen has no dropdown item to select, so it goes through the
   * same "New…" sentinel a user would reach for by hand. Selecting a value with no matching item would
   * leave the control showing nothing at all.
   */
  const selectOrCreate = (
    value: string,
    known: { value: string }[],
    setValue: (next: string) => void,
    setTyped: (next: string) => void,
  ) => {
    if (known.some((entry) => entry.value === value)) {
      setValue(value);
      return;
    }

    setValue(NEW_VALUE);
    setTyped(value);
  };

  /**
   * Package is the one field that drives the filename, and a sigil typed into it is someone reaching for a
   * control that already exists a few rows away. Left alone, `Datadog · @work` becomes a brand by that
   * literal name: it slugs to `datadog-work.` rather than the `work.datadog.` the convention specifies, and
   * the list reads it back as part of the brand rather than as a scope.
   *
   * The sigil therefore always leaves the brand. Where it lands defers to the user: a control they have
   * already set is never overridden, and a conflicting sigil is reported as dropped instead. On blur rather
   * than on change, because `@w` already matches and a per-keystroke hoist would swallow the token as it
   * was being typed.
   */
  const hoistPackageFields = (typed: string) => {
    const fields = splitTypedPackage(typed);
    if (!fields.environment && !fields.category) return;

    const notes: string[] = [];

    if (fields.environment && environment) notes.push(`dropped @${fields.environment}, Environment is already set`);
    if (fields.environment && !environment) {
      selectOrCreate(fields.environment, facets.environments, setEnvironment, setNewEnvironment);
      notes.push(`moved @${fields.environment} to Environment`);
    }

    if (fields.category && category) notes.push(`dropped #${fields.category}, Category is already set`);
    if (fields.category && !category) {
      selectOrCreate(fields.category, facets.categories, setCategory, setNewCategory);
      notes.push(`moved #${fields.category} to Category`);
    }

    setPackageName(fields.brand ?? "");
    setHoisted(`${notes.join(", ").replace(/^./, (first) => first.toUpperCase())}.`);
  };

  const placeholder = findPlaceholder(target);
  const filename =
    title.trim() && target.trim()
      ? scriptFilename({
          title,
          target,
          environment: chosenEnvironment || undefined,
          packageName: resolvedPackage || undefined,
        })
      : "";
  const preview = filename && placeholder ? `${filename} — prompts for “${placeholder}”` : filename;

  const submit = async () => {
    if (!title.trim() || !target.trim()) {
      await showFailureToast(new Error("A title and a target are both required"), { title: "Nothing to create" });
      return;
    }

    if (!directory) {
      await showFailureToast(new Error("Add a script directory in the extension preferences first"), {
        title: "No directory",
      });
      return;
    }

    try {
      const path = await createScript({
        directory,
        title,
        target,
        environment: chosenEnvironment,
        packageName: resolvedPackage,
        category: chosenCategory,
        application,
        desktopApplication,
        icon,
        author: preferences.defaultAuthor,
        authorURL: preferences.defaultAuthorURL,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Script Command created",
        message: path,
        primaryAction: { title: "Open in Editor", onAction: () => open(path) },
      });

      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Could not create the Script Command" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Link Command" icon={Icon.NewDocument} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Netflix" value={title} onChange={setTitle} />
      <Form.TextField
        id="target"
        title="Target"
        placeholder="https://www.netflix.com"
        info={`A URL, or a path like ~/Downloads.

Put {query} anywhere in a URL to make it a search command: Raycast prompts for the value and percent-encodes it before opening.`}
        value={target}
        onChange={setTarget}
      />

      <Form.Separator />

      <Form.Dropdown id="directory" title="Directory" value={directory} onChange={setDirectory}>
        {directories.map((entry) => (
          <Form.Dropdown.Item key={entry} title={collapseHome(entry)} value={entry} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="environment"
        title="Environment"
        info='Prefixes the title with "@work · " and the filename with "work.", so the command gets its own section in the list and can be filtered on.'
        value={environment}
        onChange={setEnvironment}
      >
        <Form.Dropdown.Item title="None" value="" />
        {facets.environments.map((entry) => (
          <Form.Dropdown.Item key={entry.value} title={`@${entry.value}`} value={entry.value} />
        ))}
        <Form.Dropdown.Item title="New…" value={NEW_VALUE} />
      </Form.Dropdown>

      {environment === NEW_VALUE ? (
        <Form.TextField
          id="newEnvironment"
          title="New Environment"
          placeholder="work"
          value={newEnvironment}
          onChange={setNewEnvironment}
        />
      ) : null}

      <Form.TextField
        id="packageName"
        title="Package"
        placeholder={suggestedPackage ?? "Netflix"}
        info="The app or service this belongs to, shown as the subtitle. Left empty it is taken from the target's domain. Commands sharing a package sit together in the list."
        value={packageName}
        onChange={(next) => {
          setPackageName(next);
          setHoisted("");
        }}
        onBlur={(event) => hoistPackageFields(event.target.value ?? "")}
      />

      {hoisted ? <Form.Description text={hoisted} /> : null}

      <Form.Dropdown
        id="category"
        title="Category"
        info='Appended to the package as " · #media". It stays out of the title, so the list shows what the command is rather than what kind of thing it is.'
        value={category}
        onChange={setCategory}
      >
        <Form.Dropdown.Item title="None" value="" />
        {facets.categories.map((entry) => (
          <Form.Dropdown.Item key={entry.value} title={`#${entry.value}`} value={entry.value} />
        ))}
        <Form.Dropdown.Item title="New…" value={NEW_VALUE} />
      </Form.Dropdown>

      {category === NEW_VALUE ? (
        <Form.TextField
          id="newCategory"
          title="New Category"
          placeholder="media"
          value={newCategory}
          onChange={setNewCategory}
        />
      ) : null}

      {canRoute ? (
        <Form.Dropdown
          id="desktopApplication"
          title="Desktop App"
          info="The native app for this service, if it has one. Picking it turns the command into a surface router: it opens the app where the app is installed and the target where it is not, so the same command works on machines that differ in what they have. It stays argument-free, so it still fires from a hotkey."
          value={desktopApplication}
          onChange={setDesktopApplication}
        >
          <Form.Dropdown.Item title="None — always open the target" value="" />
          {(applications ?? []).map((app) => (
            <Form.Dropdown.Item key={app.path} title={app.name} value={app.path} icon={{ fileIcon: app.path }} />
          ))}
        </Form.Dropdown>
      ) : null}

      <Form.Dropdown id="application" title="Open With" value={application} onChange={setApplication}>
        <Form.Dropdown.Item title="Default application" value="" />
        {(applications ?? []).map((app) => (
          <Form.Dropdown.Item key={app.path} title={app.name} value={app.name} icon={{ fileIcon: app.path }} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="icon"
        title="Icon"
        placeholder="Leave empty to download the site's icon"
        info="Accepts an emoji, an https URL, or a path to a file next to the script. Left empty, the site's own icon is fetched once and stored in the script directory — a hotlinked icon renders as nothing at all when it 404s, and Raycast gives no hint that it happened."
        value={icon}
        onChange={setIcon}
      />

      {preview ? <Form.Description title="Will Create" text={preview} /> : null}
    </Form>
  );
};

export default Command;
