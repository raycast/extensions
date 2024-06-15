import { Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Location, getLocations } from "rickmortyapi";
import 'cross-fetch/polyfill';
import { useState } from "react";

export default function Locations() {
    const [searchName, setSearchName] = useState("");

    const { isLoading, data: locations, pagination } = useCachedPromise(
        (name: string) => async (options) => {
            const response = await getLocations({ page: options.page, name });
            if (response.status!==200) throw new Error(response.statusMessage);
            const data = response.data.results as Location[];
            const hasMore = Boolean(response.data.info?.next);
          return { data, hasMore };
        },
        [searchName],
        {
            async onWillExecute() {
await showToast(Toast.Style.Animated, "Fetching Locations");
            },
            async onData(data) {
await showToast(Toast.Style.Success, `Fetched ${data.length} Locations`);
            },
          keepPreviousData: true,
          initialData: []
        },
    );

    return <List isLoading={isLoading} pagination={pagination} throttle searchBarPlaceholder="Search location name" onSearchTextChange={setSearchName}>
        {locations?.map((location, locationIndex) => <List.Item key={locationIndex} icon={Icon.Circle} title={location.name} subtitle={location.type} accessories={[
        { text: `dimensions: ${location.dimension}` },
        { text: `${location.residents.length} residents` },
            { date: new Date(location.created) }
        ]} />
        )}
    </List>
}