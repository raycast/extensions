import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { getTextAndIconFromVal, getTitleFromKey, isInvalidUrl } from "./utils/functions";
import ErrorComponent from "./components/ErrorComponent";
import { useGetUserPackageInformation, useGetUserPackages } from "./utils/hooks";
import InvalidUrlComponent from "./components/InvalidUrlComponent";

export default function UserPackages() {
  if (isInvalidUrl()) return <InvalidUrlComponent />;

  const { isLoading, data: packages, error } = useGetUserPackages();

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading}>
      {packages?.map((packageName) => (
        <List.Item
          key={packageName}
          title={packageName}
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action.Push
                title="Get Detailed Information"
                icon={Icon.Network}
                target={<GetPackageInformation packageName={packageName} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type GetPackageInformationProps = {
  packageName: string;
};
function GetPackageInformation({ packageName }: GetPackageInformationProps) {
  const { isLoading, data: information } = useGetUserPackageInformation(packageName);

  return (
    <Detail
      navigationTitle="User Package Information"
      isLoading={isLoading}
      markdown={`## Package: ${packageName}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy All as JSON"
            content={JSON.stringify({ package: packageName, ...information })}
          />
        </ActionPanel>
      }
      metadata={
        !information ? undefined : (
          <Detail.Metadata>
            {Object.entries(information).map(([key, val]) => {
              const title = getTitleFromKey(key);
              const { text, icon } = getTextAndIconFromVal(val);
              return <Detail.Metadata.Label key={key} title={title} text={text} icon={icon} />;
            })}
          </Detail.Metadata>
        )
      }
    />
  );
}
