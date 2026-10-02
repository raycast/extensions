import {
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  open,
  openCommandPreferences,
} from "@raycast/api";

import {
  clipText,
  getBoundedPreferenceNumber,
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
} from "./components/Menu";
import { pluralize } from "./helpers";
import {
  findPackageByName,
  formatDownloadCount,
  getPackageIcon,
  getPackageTypeTitle,
  getPackageVersionCount,
  groupPackagesByType,
} from "./helpers/package";
import { withGitHubClient } from "./helpers/withGithubClient";
import { MissingPackagesScopeError, PACKAGES_SCOPE, useMyPackages } from "./hooks/useMyPackages";
import { usePackageDownloadCount } from "./hooks/usePackageDownloadCount";

async function launchMyPackagesCommand(): Promise<void> {
  return launchCommand({ name: "my-packages", type: LaunchType.UserInitiated });
}

const TITLE_MAX_LENGTH = 30;

function getMaxPackagesPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function MyPackagesMenu() {
  const { showtext, titlePackage } = getPreferenceValues<Preferences.MyPackagesMenu>();
  const { data, isLoading, error } = useMyPackages();

  const packages = data?.packages ?? [];
  const failedTypes = data?.failedTypes ?? [];
  const sections = groupPackagesByType(packages);

  const titledPackage = titlePackage ? findPackageByName(packages, titlePackage) : undefined;
  const { data: downloadCount, isLoading: isLoadingDownloadCount } = usePackageDownloadCount(titledPackage);

  // A name that matches nothing falls back to the count, so a typo never blanks the title.
  const title = titledPackage
    ? [
        clipText(titledPackage.name, TITLE_MAX_LENGTH),
        downloadCount === undefined ? undefined : formatDownloadCount(downloadCount),
      ]
        .filter(Boolean)
        .join(" · ")
    : showtext
      ? `${packages.length}`
      : undefined;

  const tooltip = titledPackage
    ? downloadCount === undefined
      ? titledPackage.name
      : `${titledPackage.name} — ${downloadCount.toLocaleString()} ${pluralize(downloadCount, "download")}`
    : "My Packages";

  const errorText = error
    ? error instanceof MissingPackagesScopeError
      ? `Missing "${PACKAGES_SCOPE}" scope — re-authenticate in the extension preferences`
      : error.message
    : undefined;

  // `MenuBarRoot` renders the error instead of its children, so a transient failure over
  // cached packages becomes a row instead. A missing scope never heals, so it takes over.
  const isScopeError = error instanceof MissingPackagesScopeError;
  const errorMessage = isScopeError || packages.length === 0 ? errorText : undefined;

  return (
    <MenuBarRoot
      title={title}
      icon={{ source: Icon.Box, tintColor: Color.PrimaryText }}
      tooltip={tooltip}
      isLoading={isLoading || isLoadingDownloadCount}
      error={errorMessage}
    >
      {sections.map((section) => (
        <MenuBarSection
          key={section.packageType}
          title={section.title}
          subtitle={`${section.packages.length}`}
          maxChildren={getMaxPackagesPreference()}
          moreElement={(hidden) => (
            <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPackagesCommand()} />
          )}
        >
          {section.packages.map((pkg) => {
            const versionCount = getPackageVersionCount(pkg);

            return (
              <MenuBarItem
                key={pkg.id}
                title={pkg.name}
                subtitle={pkg.repository?.full_name}
                icon={getPackageIcon(pkg.package_type)}
                tooltip={
                  versionCount === undefined ? undefined : pluralize(versionCount, "version", { withNumber: true })
                }
                onAction={() => open(pkg.html_url)}
              />
            );
          })}
        </MenuBarSection>
      ))}

      {!isLoading && sections.length === 0 ? (
        <MenuBarSection>
          <MenuBarItem title="No Packages" icon={Icon.Info} />
        </MenuBarSection>
      ) : null}

      {failedTypes.length > 0 ? (
        <MenuBarSection>
          <MenuBarItem
            title={`Couldn't load ${failedTypes.map(getPackageTypeTitle).join(", ")}`}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            tooltip="Some packages may be missing from this menu"
            onAction={() => launchMyPackagesCommand()}
          />
        </MenuBarSection>
      ) : null}

      {errorText && !errorMessage ? (
        <MenuBarSection>
          <MenuBarItem
            title="Couldn't refresh packages"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            tooltip={errorText}
            onAction={() => launchMyPackagesCommand()}
          />
        </MenuBarSection>
      ) : null}

      {titlePackage && !titledPackage && packages.length > 0 ? (
        <MenuBarSection>
          <MenuBarItem
            title={`No package named "${titlePackage}"`}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            tooltip="Check the Menu Bar Title preference"
            onAction={() => openCommandPreferences()}
          />
        </MenuBarSection>
      ) : null}

      <MenuBarSection>
        <MenuBarItem
          title="Open My Packages"
          icon={Icon.AppWindowList}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launchMyPackagesCommand()}
        />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyPackagesMenu);
