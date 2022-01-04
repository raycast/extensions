import {
    ActionPanel,
    List,
    OpenInBrowserAction,
    getLocalStorageItem,
    getPreferenceValues,
    setLocalStorageItem, showToast, ToastStyle
} from "@raycast/api";
import {ForgeData, Server, Site} from "./interfaces";
import {useEffect, useState} from "react";
import axios from "axios";

export default () => {

    const [state, setState] = useState<{ isLoading: boolean, results?: ForgeData }>({isLoading: true})

    useEffect(() => {

        async function fetch() {

            let localForgeData: string = await getLocalStorageItem("forge-data") || "";
            if (localForgeData !== "") {
                const forgeData: ForgeData = JSON.parse(localForgeData);
                setState({isLoading: false, results: forgeData})
                return;
            }

            const preferences = getPreferenceValues();

            const BASE_URL = 'https://forge.laravel.com/api/v1';

            const config = {
                url: BASE_URL + '/servers',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + preferences.token,
                },
            }

            try {
                const serversResponse = await axios(config);
                const apiForgeData: ForgeData = serversResponse.data;

                for (let i = 0; i < apiForgeData.servers.length; i++) {
                    config.url = BASE_URL + '/servers/' + apiForgeData.servers[i].id + '/sites';

                    const sitesResponse = await axios(config);
                    apiForgeData.servers[i].sites = sitesResponse.data.sites;
                }

                apiForgeData.servers = apiForgeData.servers.map((server): Server => {
                    return {
                        id: server.id.toString(),
                        name: server.name,
                        ip_address: server.ip_address,
                        url: 'https://forge.laravel.com/servers/' + server.id + '/sites',
                        sites: server.sites?.map((site): Site => {
                            return {
                                id: site.id.toString(),
                                name: site.name,
                                url: 'https://forge.laravel.com/servers/' + server.id + '/sites/' + site.id + '/application'
                            }
                        })
                    }
                })

                console.log('API');

                await setLocalStorageItem("forge-data", JSON.stringify(apiForgeData));
                setState({isLoading: false, results: apiForgeData})

            } catch (e) {

                if (typeof e === "string") {
                    showToast(ToastStyle.Failure, "Failed", e);
                } else if (e instanceof Error) {
                    showToast(ToastStyle.Failure, "Failed", e.message);
                }

                setState({isLoading: false})
                return null;
            }
        }

        fetch();
    }, []);


    return (
        <List isLoading={state.isLoading} searchBarPlaceholder="Filter resources...">
            {state && state.results?.servers?.map((server: Server) => {

                return <List.Section key={server.id} title={server.name}>
                    <List.Item
                        id={server.id}
                        key={server.id}
                        title={server.name}
                        subtitle={server.ip_address}
                        actions={
                            <ActionPanel>
                                <OpenInBrowserAction title="Go to server"
                                                     url={server.url}/>
                            </ActionPanel>
                        }
                    />
                    {server.sites?.map((site: Site) => (
                        <List.Item
                            id={site.id}
                            key={site.id}
                            title={site.name}
                            actions={
                                <ActionPanel>
                                    <OpenInBrowserAction title="Go to site"
                                                         url={site.url}/>
                                </ActionPanel>
                            }
                        />
                    ))}
                </List.Section>
            })}
        </List>
    );
}
