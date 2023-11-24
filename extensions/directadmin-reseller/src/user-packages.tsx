import { useEffect, useState } from "react";
import { getUserPackageInformation, getUserPackages } from "./utils/api";
import { ErrorResponse, GetUserPackageInformationResponse, GetUserPackagesResponse } from "./types";
import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { getTitleFromKey } from "./utils/functions";
import ErrorComponent from "./components/ErrorComponent";

export default function UserPackages() {
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<string[]>();
  const [error, setError] = useState<ErrorResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getUserPackages();
    if (response.error === "0") {
      const data = response as GetUserPackagesResponse;
      const { list } = data;
      setPackages(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Packages`);
    } else if (response.error === "1") setError(response as ErrorResponse);
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading}>
      {packages &&
        packages.map((packageName) => (
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
  const [isLoading, setIsLoading] = useState(true);
  const [information, setInformation] = useState<GetUserPackageInformationResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getUserPackageInformation(packageName);
    if (response.error === "0") {
      const data = response as GetUserPackageInformationResponse;
      setInformation(data);

      await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Package Information");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

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
              if (val === "ON")
                return (
                  <Detail.Metadata.Label
                    key={key}
                    title={title}
                    text={undefined}
                    icon={{ source: Icon.Check, tintColor: Color.Green }}
                  />
                );
              else if (val === "OFF")
                return (
                  <Detail.Metadata.Label
                    key={key}
                    title={title}
                    text={undefined}
                    icon={{ source: Icon.Multiply, tintColor: Color.Red }}
                  />
                );
              else return <Detail.Metadata.Label key={key} title={title} text={val} />;
            })}
          </Detail.Metadata>
        )
      }
    />
  );
}
