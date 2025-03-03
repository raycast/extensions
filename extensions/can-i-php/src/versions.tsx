import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Accessory } from "./lib/types/accessory";
import { PhpVersion } from "./lib/types/phpVersion";
import { getPhpVersionStatus } from "./lib/util/getPhpVersionStatus";
import { PhpVersionStatusEnum } from "./lib/types/phpVersionStatusEnum";
import { getHumanDifference } from "./lib/util/getHumanDifference";
import { versionCompare } from "./lib/util/versionCompare";

function getAccessories(phpVersion: PhpVersion) {
  const accessories: Accessory[] = [];

  if (phpVersion.status === PhpVersionStatusEnum.Active) {
    accessories.push({ text: { value: "Active", color: Color.Green } });
  } else if (phpVersion.status === PhpVersionStatusEnum.SecurityUpdates) {
    accessories.push({ text: { value: "Security", color: Color.Yellow } });
  } else {
    accessories.push({ text: { value: "EOL", color: Color.Red } });
  }

  return accessories;
}

function getStatusTagColor(status?: PhpVersionStatusEnum | null) {
  if (status === PhpVersionStatusEnum.Active) {
    return Color.Green;
  } else if (status === PhpVersionStatusEnum.SecurityUpdates) {
    return Color.Yellow;
  } else {
    return Color.Red;
  }
}

function getReleaseAnnouncementLink(phpVersion: PhpVersion): string {
  if (versionCompare(phpVersion.cycle, "8.0") >= 0) {
    return `https://www.php.net/releases/${phpVersion.cycle}/en.php`;
  } else if (versionCompare(phpVersion.cycle, "5.1") >= 0) {
    return `https://www.php.net/releases/${phpVersion.cycle.replace(".", "_")}_0.php`;
  } else {
    return "https://www.php.net/ChangeLog-5.php#PHP_5_0";
  }
}

export default function Command() {
  const { isLoading, data } = useFetch("https://endoflife.date/api/php.json");

  const phpVersions = Array.isArray(data)
    ? (data as PhpVersion[]).map((phpVersion: PhpVersion) => {
        phpVersion.status = getPhpVersionStatus(phpVersion);
        phpVersion.releaseDateHuman = getHumanDifference(phpVersion.releaseDate);
        phpVersion.eolHuman = getHumanDifference(phpVersion.eol);
        phpVersion.supportHuman = getHumanDifference(phpVersion.support);
        phpVersion.latestReleaseDateHuman = getHumanDifference(phpVersion.latestReleaseDate);
        return phpVersion;
      })
    : [];

  return (
    <List isShowingDetail isLoading={isLoading}>
      {phpVersions.map((phpVersion) => (
        <List.Item
          key={phpVersion.cycle}
          title={"PHP  " + phpVersion.cycle}
          accessories={getAccessories(phpVersion)}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={phpVersion.status ?? ""}
                      color={getStatusTagColor(phpVersion.status)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Latest release version" text={phpVersion.latest} />
                  <List.Item.Detail.Metadata.Label
                    title="Active Support"
                    text={phpVersion.supportHuman + " (" + phpVersion.support + ")"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="EOL / Security Updates until"
                    text={phpVersion.eolHuman + " (" + phpVersion.eol + ")"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Initial release date"
                    text={phpVersion.releaseDateHuman + " (" + phpVersion.releaseDate + ")"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Latest release date"
                    text={phpVersion.latestReleaseDateHuman + " (" + phpVersion.latestReleaseDate + ")"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Megaphone}
                title="Release Announcement on php.net"
                url={getReleaseAnnouncementLink(phpVersion)}
              />
              <Action.OpenInBrowser
                icon={Icon.AppWindowGrid3x3}
                title="Supported Versions on php.net"
                url="https://www.php.net/supported-versions.php"
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
