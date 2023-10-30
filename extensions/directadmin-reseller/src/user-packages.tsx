import { useEffect, useState } from "react";
import {  getUserPackageInformation, getUserPackages } from "./utils/api";
import { TITLES_FOR_KEYS } from "./utils/constants";
import { GetUserPackageInformationResponse, GetUserPackagesResponse } from "./types";
import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";

export default function UserPackages() {
    const { push } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [packages, setPackages] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true);
        const response = await getUserPackages();
        if (response.error==="0") {
            const data = response as GetUserPackagesResponse;
            const { list } = data;
            setPackages(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Packages`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
getFromApi();
    }, [])

    return <List isLoading={isLoading}>
        {packages && packages.map(packageName => <List.Item key={packageName} title={packageName} icon={Icon.Box} actions={<ActionPanel>
            <Action title="Get Detailed Information" icon={Icon.Network} onAction={() => push(<GetPackageInformation packageName={packageName} />)} />
        </ActionPanel>} />)}
    </List>
}

type GetPackageInformationProps = {
    packageName: string;
}
function GetPackageInformation({ packageName }: GetPackageInformationProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [information, setInformation] = useState<GetUserPackageInformationResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserPackageInformation(packageName);
        if (response.error==="0") {
            const data = response as GetUserPackageInformationResponse;
            setInformation(data);

            await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Package Information");
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <Detail navigationTitle="User Package Information" isLoading={isLoading} markdown={`## Package: ${packageName}`} metadata={!information ? undefined : <Detail.Metadata>
        {Object.entries(information).map(([key, val]) => {
            const title = TITLES_FOR_KEYS[key as keyof typeof TITLES_FOR_KEYS] || key;
            if (val==="ON")
                return <Detail.Metadata.Label key={key} title={title} text={undefined} icon={{ source: Icon.Check, tintColor: Color.Green }} />
            else if (val==="OFF")
                return <Detail.Metadata.Label key={key} title={title} text={undefined} icon={{ source: Icon.Multiply, tintColor: Color.Red }} />
            else
                return <Detail.Metadata.Label key={key} title={title} text={val} />
            
        })}
    </Detail.Metadata>} />
}