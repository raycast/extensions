import {
    ActionPanel,
    CopyToClipboardAction,
    List,
    OpenInBrowserAction,
    getLocalStorageItem,
    setLocalStorageItem,

} from "@raycast/api";
import {useState, useEffect} from "react";
import services from './services'

export default function ServiceList() {
    const [state, setState] = useState({services: []})
    const [refresh, setRefresh] = useState()

    const refreshServices = async () => {
        const servicesWithUsage = await Promise.all(services.Services.map(async (service, i) => {
            const key = 'service' + service.ServiceCode
            const usageCount = await getLocalStorageItem(key)

            return {
                ...service,
                usageCount: Number(usageCount ?? 0)
            }
        }))

        setState({services: servicesWithUsage})
    }

    useEffect(() => {
        (async () => {
            if (state.services.length === 0) {
                refreshServices()
                setRefresh(Math.random())
            }
        })()
    }, [])

    useEffect(() => {
        (async () => {
            refreshServices()
        })()
    }, [refresh])

    return (
        <List isLoading={state.services.length === 0} searchBarPlaceholder="Filter AWS services by name...">
            {state.services.sort((a, b) => (b.usageCount - a.usageCount)).map((service, i) => {
                return <ServiceListItem key={i} service={service} setRefresh={setRefresh}/>
            })}
        </List>
    );
}

function ServiceListItem({service, setRefresh}) {
    const url = `https://console.aws.amazon.com/${service.ServiceCode}`

    const increaseUsageCount = async (service) => {
        const key = 'service' + service.ServiceCode
        const currentValue = await getLocalStorageItem(key)


        const val = Number(currentValue ?? 0) + 1
        const set = await setLocalStorageItem(key, val)

        setRefresh(Math.random())
    }

    return (
        <List.Item
            id={service.ServiceCode}
            key={service.ServiceCode}
            title={service.ServiceName}
            icon="aws-logo.png"
            actions={
                <ActionPanel>
                    <OpenInBrowserAction onOpen={(e) => {
                        increaseUsageCount(service)
                    }} url={url}/>
                    <CopyToClipboardAction title="Copy URL" content={url}/>
                </ActionPanel>
            }
        />
    );
}